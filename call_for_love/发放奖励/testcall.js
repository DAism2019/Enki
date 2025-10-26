//
const abiAddress=require('./abi/address.json')
// console.log(abiAddress)
const { ethers } = require('hardhat')
let res;

async function main(){
    await hre.run('compile');
    const [singer,other,three] = await ethers.getSigners();
    console.log("singer:",singer.address);
    console.log("other:",other.address);
    console.log("three:",three.address);

    const utoContract =geneContract('UnitToken',singer);


   await prinfBlance(utoContract,singer,other,three)

    const contractName='CallForLoveRewards';
    const callContract=geneContract(contractName,singer);

    const links=['https://melodylabs.io/1','https://melodylabs.io/2','https://melodylabs.io/3'];
    const scores=[85,90,60];
    const wallets=[singer.address,other.address,three.address];

    console.log("links:",links);
    console.log("scores:",scores);
    console.log("wallets:",wallets);

    console.log("-------------------------------------------------------")

    //批量上传
    res=await callContract.uploadBatch(links,scores,wallets);
    console.log(`${contractName}.uploadBatch hash: `+res.hash);
    await res.wait();
    console.log(`${contractName}.uploadBatch end. `)
   await prinfBlance(utoContract,singer,other,three)

    console.log("-------------------------------------------------------")
    //总分
    res=await callContract.getTotalScore();
    console.log(`总分：`,res);
    //当前阶段
    res=await callContract.getCurrentPhase();
    console.log(`当前阶段`,res);
    //提交数量
    res=await callContract.getSubmissionCount();
    console.log(`提交数量`,res);


    console.log("-------------------------------------------------------")
    //停止上传
    res=await callContract.stopUpload();
    console.log(`${contractName}.stopUpload hash: `+res.hash);
    await res.wait();
    console.log(`${contractName}.stopUpload end. `)
    console.log("-------------------------------------------------------")

     //当前阶段
     res=await callContract.getCurrentPhase();
     console.log(`当前阶段`,res);

     res=await callContract.getSubmissionCount();
     console.log(`提交数量`,res);
     console.log("-------------------------------------------------------")
 

     const SatoshiUTOFund=geneContract('SatoshiUTOFund',singer);
     const a = new Date();
     const d = new Date(a.setDate(a.getDate() + 7));
     console.log( {pa: [
        21000*parseInt(res.toString())*1e8+1e8,
        21000*parseInt(res.toString())*1e8+1e8,
        parseInt(d.getTime()/1000)
    ],
    as: abiAddress[contractName]})
     res=await SatoshiUTOFund.addRule(
        [
            21000*parseInt(res.toString())*1e8+1e8,
            21000*parseInt(res.toString())*1e8+1e8,
            parseInt(d.getTime()/1000)
        ],
        abiAddress[contractName]
    )
     console.log(`SatoshiUTOFund.addRule hash: `+res.hash);
     await res.wait();
     console.log(`SatoshiUTOFund.addRule end. `);
     console.log("-------------------------------------------------------") 

     res=await callContract.depositUTO();
     console.log(`${contractName}.depositUTO hash: `+res.hash);
     await res.wait();
     console.log(`${contractName}.depositUTO end. `)
     console.log("-------------------------------------------------------")
     
    //当前阶段
    res=await callContract.getCurrentPhase();
    console.log(`当前阶段`,res);
    console.log("-------------------------------------------------------")

    //分发
    res=await callContract.distribute(3);
    console.log(`${contractName}.distribute hash: `+res.hash);
    await res.wait();
    console.log(`${contractName}.distribute end. `)
    console.log("-------------------------------------------------------")
    
    //当前阶段
    res=await callContract.getCurrentPhase();
    console.log(`当前阶段`,res);
    //提交数量
    res=await callContract.getSubmissionCount();
    console.log(`提交数量`,res);
    console.log("-------------------------------------------------------")

    await prinfBlance(utoContract,singer,other,three)

    


  
}
async function prinfBlance(utoContract,singer,other,three) {
    console.log("-------------------------------------------------------")
    res=await utoContract.balanceOf(singer.address);
    console.log(singer.address, "singer blance:",ethers.formatUnits(res,8));
    res=await utoContract.balanceOf(other.address);
    console.log(other.address, "other blance:",ethers.formatUnits(res,8));
    res=await utoContract.balanceOf(three.address);
    console.log(three.address, "three blance:",ethers.formatUnits(res,8));
    console.log("-------------------------------------------------------")
}

function geneContract(name,singer)
{
  let cabi = artifacts.readArtifactSync(name);
  let cur=new ethers.Contract(abiAddress[name],cabi.abi,singer)
  return cur

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
