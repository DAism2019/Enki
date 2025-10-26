// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/// @notice Interface for the Satoshi UTO Fund contract (external contract)
/// @notice Satoshi UTO 基金合约接口（外部合约）
interface ISatoshiUTOFund {
    /// @notice Apply a rule to allocate tokens
    /// @notice 使用某条规则分配代币
    /// @param index Rule index 规则索引
    /// @param to Target address 接收地址
    /// @param amount Amount of UTO requested 请求的代币数量
    /// @return Rule ID that was used 返回使用的规则ID
    function useRule(uint index, address to, uint amount) external returns(uint);

    /// @notice Get all rule IDs associated with an address
    /// @notice 获取某个地址可用的规则ID列表
    /// @param addr The address to check 查询的地址
    /// @return Array of rule IDs 规则ID数组
    function getRuleWarehouse(address addr) external returns(uint[] memory);
}
/**
 * @title IHonorTokens
 * @notice 荣誉通证合约接口，用于铸造荣誉通证 (Interface for Honor Tokens contract, used to mint honor tokens)
 */
interface IHonorTokens {
    function mint(uint256 scId, address to, string[] memory tips) external returns (uint256);
}
/// @title CallForLoveRewards
/// @notice Reward distribution contract for CallForLove campaign
/// @notice CallForLove 活动奖励分发合约
contract CallForLoveRewards is AccessControl {
    using Strings for uint256;
    using Strings for address;
    using SafeERC20 for IERC20;
    using EnumerableMap for EnumerableMap.AddressToUintMap;

    // Role for managers (uploading, distributing)
    // 管理员角色（上传信息、分发奖励）
    bytes32 public constant MANAGER_ROLE  = keccak256("MANAGER_ROLE");

    // Total reward to be distributed 总奖励池
    uint256 public TOTAL_REWARD = 0;

    // Maximum number of submissions 
    // 最大提交数
    uint256 public constant MAX_SUBMISSIONS = 1500;

    // Address of the external fund 合约地址（外部基金）
    address public satoshiFund;

    // 荣誉通证合约 (Honor tokens contract)
    IHonorTokens public honorToken;

    // UTO token interface UTO代币接口
    IERC20 public uToken;

    /// @notice Enum of contract phases 合约运行阶段
    enum Phase { Uploading, StopUpload, DepositUTO, Distributed }
    Phase public currentPhase;

    /// @notice Struct representing a single submission 提交信息结构体
    struct Submission {
        string link;         // Link of the submission 提交的链接
        uint256 score;       // Score assigned to the submission 提交的分数
        address wallet;      // Wallet of the submitter 提交者的钱包地址
        bool rewarded;       // Whether rewards have been distributed 是否已分发奖励
        uint256 rewardAmount;// Reward amount actually distributed 实际分发的奖励数量
    }

    // Array of all submissions 所有提交记录
    Submission[] private submissions;

    EnumerableMap.AddressToUintMap private walletSubmissions;

    // Last index of submissions that were distributed 上次分发到的索引位置
    uint256 public lastDistributedIndex;

    // Sum of all scores (used for proportional reward calculation)
    // 总分数（用于按比例分配奖励）
    uint256 public totalScore;

    // -------- Events | 事件 --------
    event InfoUploaded(uint256 count, uint256 submissionsTotal);   // Emitted when new submissions are uploaded 上传新提交时触发
    event PhaseChanged(Phase newPhase);                           // Emitted when contract phase changes 阶段变化时触发
    event RewardsBatchDistributed(address[] users, uint256[] rewards); // Emitted when rewards are distributed in batch 批量分发奖励时触发
    event UTODeposited(uint256 amount);                           // Emitted when UTO is deposited 存入UTO时触发

    /// @notice Constructor 构造函数
    /// @param _satoshiFund Address of the Satoshi UTO fund Satoshi基金地址
    /// @param _uToken Address of the UTO token UTO代币地址
    /// @param _honorToken Address of the HonorToken  荣誉通证地址
    /// @param _initOwner Initial owner (admin role) 初始合约管理员
    /// @param _admin Manager address (upload/distribute) 管理员地址（上传/分发）
    constructor(address _satoshiFund, address _uToken,address _honorToken, address _initOwner, address _admin) {
        require(_satoshiFund != address(0), "Invalid satoshiFund address");
        require(_uToken != address(0), "Invalid uToken address");
        require(_honorToken != address(0), "Invalid honorToken address");
        honorToken = IHonorTokens(_honorToken);
        satoshiFund = _satoshiFund;
        uToken = IERC20(_uToken);
        lastDistributedIndex = 0;
        currentPhase = Phase.Uploading;
        

        // Assign roles 分配角色
        _grantRole(DEFAULT_ADMIN_ROLE, _initOwner);
        _grantRole(MANAGER_ROLE, _admin);
    }

    /// @notice Deposit UTO from fund into this contract
    /// @notice 从基金存入UTO到合约中
    function depositUTO() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(currentPhase == Phase.StopUpload, "Not in StopUpload phase"); // Must be after StopUpload 必须在停止上传后
        require(satoshiFund != address(0), "satoshiFund not set");

        // Get rules from fund 获取可用规则
        uint[] memory ruleIds = ISatoshiUTOFund(satoshiFund).getRuleWarehouse(address(this));
        require(ruleIds.length > 0, "No rules available");

        //TOTAL_REWARD = (21_000 * submissions.length +1) * 1e8;
        TOTAL_REWARD = (52 * totalScore) *1e8;
        // Request tokens from fund 从基金申请代币
        ISatoshiUTOFund(satoshiFund).useRule(ruleIds[ruleIds.length-1], address(this), TOTAL_REWARD);

        // Ensure balance is sufficient 确保代币余额充足
        require(uToken.balanceOf(address(this)) >= TOTAL_REWARD,"Insufficient reward funds deposited");

        currentPhase = Phase.DepositUTO;
        emit UTODeposited(TOTAL_REWARD);
    }

    /// @notice Upload multiple submissions in batch 批量上传提交
    /// @param links Array of submission links 提交链接数组
    /// @param scores Array of submission scores 提交分数数组
    /// @param wallets Array of submitter wallets 提交者钱包数组
    function uploadBatch(
        string[] calldata links,
        uint256[] calldata scores,
        address[] calldata wallets
    ) external onlyRole(MANAGER_ROLE) {
        require(currentPhase == Phase.Uploading, "Not in Uploading phase");
        require(links.length == scores.length && scores.length == wallets.length, "Array length mismatch");
        require(submissions.length + links.length <= MAX_SUBMISSIONS, "Exceeds max submissions");
        for (uint256 i = 0; i < links.length; i++) {
            address wallet = wallets[i];
            require(!walletSubmissions.contains(wallet),"wallet array exits");
            // Create submission 新建提交
            submissions.push(Submission({
                link: links[i],
                score: scores[i],
                wallet: wallet,
                rewarded: false,
                rewardAmount: 0
            }));
            uint256 idx = submissions.length - 1;
            walletSubmissions.set(wallet,idx);
            totalScore += scores[i];                 // Accumulate score 累加总分
        }

        emit InfoUploaded(links.length, submissions.length);
    }

    /// @notice Stop accepting submissions 停止接受提交
    function stopUpload() external onlyRole(MANAGER_ROLE) {
        require(currentPhase == Phase.Uploading, "Not in Uploading phase");
        require(totalScore > 0, "No scores submitted"); // Must have at least one submission 必须有提交记录

        currentPhase = Phase.StopUpload;
        emit PhaseChanged(currentPhase);
    }

    /// @notice Distribute rewards to submissions in batch 批量分发奖励
    /// @param count Number of submissions to process 本次分发的提交数量
    function distribute(uint256 count) external onlyRole(MANAGER_ROLE) {
        require(currentPhase == Phase.DepositUTO, "Not in DepositUTO phase");

        uint256 end = lastDistributedIndex + count;
        if (end > submissions.length) {
            end = submissions.length;
        }

        require(end > lastDistributedIndex, "nothing to distribute");

        address[] memory batchUsers = new address[](end - lastDistributedIndex);
        uint256[] memory batchRewards = new uint256[](end - lastDistributedIndex);

        uint256 k = 0;
        for (uint256 i = lastDistributedIndex; i < end; i++) {
            Submission storage sub = submissions[i];
            require(!sub.rewarded, "already rewarded");

            uint256 reward = 0;
            if (sub.score > 0) {
                // Calculate reward proportionally 按分数比例计算奖励
                reward = Math.mulDiv(sub.score, TOTAL_REWARD, totalScore);
                uToken.safeTransfer(sub.wallet, reward); // Transfer reward 发放奖励
            }
            // 构造铸造荣誉通证所需的提示信息数组 / Construct tips for minting honor tokens
            string[] memory _tips = new string[](6);
            _tips[0] = string.concat("owner: ", sub.wallet.toHexString());
            _tips[1] = string.concat("blockNumber: ", block.number.toString());
            _tips[2] = string.concat("time: ", block.timestamp.toString());
            _tips[3] = string.concat("score: ", sub.score.toString());
            _tips[4] = string.concat("reward: ", reward.toString()," UTO");
            _tips[5] = "event: Call of Love";
            
            // 调用荣誉通证合约，为捐赠者铸造通证 / Mint honor tokens for the donor
            uint256 tokenId = honorToken.mint(3, sub.wallet, _tips);
            require(tokenId > 0, "HonorToken mint failed");

            sub.rewarded = true;
            sub.rewardAmount = reward;

            batchUsers[k] = sub.wallet;
            batchRewards[k] = reward;
            k++;
        }

        lastDistributedIndex = end;

        // If all distributed, change phase 如果全部分发完毕，进入 Distributed 阶段
        if (end == submissions.length) {
            currentPhase = Phase.Distributed;
            emit PhaseChanged(currentPhase);
        }

        emit RewardsBatchDistributed(batchUsers, batchRewards);
    }

    /// @notice Get total score of all submissions 获取所有提交的总分
    function getTotalScore() external view returns (uint256) {
        return totalScore;
    }

    /// @notice Get current phase 获取当前阶段
    function getCurrentPhase() external view returns(Phase){
        return currentPhase;
    }

    /// @notice Get number of submissions 获取提交数量
    function getSubmissionCount() external view returns (uint256) {
        return submissions.length;
    }

    /// @notice Get submission details by index 根据索引获取提交详情
    /// @param index Submission index 提交索引
    function getSubmission(uint256 index) external view returns (Submission memory) {
        require(index < submissions.length, "index out of range");
        return submissions[index];
    }

    /// @notice Get submissions by a user 获取某个用户的提交
    /// @param user User address 用户地址
    function getSubmissionsByUser(address user) external view returns (Submission memory) {
        uint256 index = walletSubmissions.get(user);
        return submissions[index];
    }
    /// @notice Get multiple users' submissions
    /// @param users Array of user addresses
    /// @return subs Array of corresponding submissions
    function getSubmissionsByUsers(address[] memory users)
        external
        view
        returns (Submission[] memory subs)
    {
        subs = new Submission[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            require(walletSubmissions.contains(users[i]), "user not found");
            uint256 index = walletSubmissions.get(users[i]);
            subs[i] = submissions[index];
        }
    }

    /// @notice Get All Wallet  获取所有的钱包地址
    function getAllWallets() external view returns (address[] memory) {
        return walletSubmissions.keys();
    }
    /// @notice Get number of wallets stored 获取已存储钱包数量
    function getWalletCount() external view returns (uint256) {
        return walletSubmissions.length();
    }

}
