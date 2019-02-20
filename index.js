require('dotenv').config();
const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const fs = require('fs');


const WEB3_PROVIDER = process.env.WEB3_PROVIDER || 'https://mainnet.infura.io';
const BNT_ADDRESS = process.env.BNT_ADDRESS || '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c';
const CONVERTER_ADDRESSES = (process.env.CONVERTER_ADDRESSES || '0xcbc6a023eb975a1e2630223a7959988948e664f3').split(',');
const LAST_PROCESSED_BLOCK = Number(process.env.LAST_PROCESSED_BLOCK) || 'latest';

const abis = { bancorConverter: { filename: 'BancorConverter.abi' } };

let web3;
let latestBlock = LAST_PROCESSED_BLOCK;

async function run() {
    console.log('Initializing');
    init();
    console.log('Done initializing');

    while (true) {
        try {
            await processBlock(latestBlock);
            await sleep(1000);
        } catch (error) {
            console.log(error);
            await sleep(15000);
        }
    }
}

async function processBlock(blockNumber) {
    const startAt = new Date();
    let block = await web3.eth.getBlock(blockNumber);
    console.log(`Processing block ${blockNumber}`);
    let transactions = block.transactions;

    // console.log(block);

    await Promise.all(transactions.map(txHash => processTransaction(txHash)));
    const totalTime = new Date(new Date() - startAt).getSeconds();
    console.log(`Done processing block ${blockNumber} in ${totalTime} seconds`);

    ///
    latestBlock = block.number + 1;
}

async function processTransaction(txHash) {
    const tx = await web3.eth.getTransaction(txHash);
    // console.log(tx);
    if (tx.to && CONVERTER_ADDRESSES.includes(tx.to.toLowerCase())) {
        // console.log('Found relevant tx!!');
        const decodedData = abiDecoder.decodeMethod(tx.input);
        processMethod(decodedData, txHash)
        // console.log(`method data: ${JSON.stringify(decodedData)}`);
    }
}

function processMethod(method, txHash) {
    if (['quickConvert', 'quickConvertPrioritized'].includes(method.name)) {
        const path = method.params[0].value;
        if (path[path.length - 1] === BNT_ADDRESS){
            const value = method.params[1].value;
            console.log(`Found conversion of ${value} ${path[0]} to BNT. txHash - ${txHash}`);
        }
    }
}

function init() {
    for (let key in abis) {
        abis[key].abi = JSON.parse(fs.readFileSync(`${__dirname}/abis/${abis[key].filename}`, 'utf8'));
        abiDecoder.addABI(abis[key].abi);
    }

    web3 = new Web3(WEB3_PROVIDER);
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

run().catch(console.log);