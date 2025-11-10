import React, { useEffect, useState } from 'react';
import { Button, Container, Card, Form, Table } from 'react-bootstrap';
import StakingAbi from '../../ABI/Staking.json';
import { stakingContracts, tokenContracts } from '../../helpers/constants';
import { ethers } from 'ethers';
import { getAllChains, getWalletData } from '../../helpers/storage';
import { decryptData } from '../../helpers/encryption';
 
import { message, Spin } from 'antd';


const TokenAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)"
];


const Staking = ({ walletAddress, selectedChain }) => {
  const [amount, setAmount] = useState('');
  const [pendingRewards, setPendingRewards] = useState(0);
  const [stakeRecord, setStakeRecord] = useState([]);
  const [chain, setChain] = useState(null);
  const [stakeToken, setStakeToken] = useState('0x0000000000000000000000000000000000000000');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [approval, setApproval] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [approving, setApproving] = useState(false);
  const [staking, setStaking] = useState(false);

  const provider = chain ? new ethers.providers.JsonRpcProvider(chain.rpcUrl) : null;
  const contract = new ethers.Contract(stakingContracts[selectedChain], StakingAbi, provider);
  const tokenContract = new ethers.Contract(tokenContracts[selectedChain], TokenAbi, provider);

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const AllChains = await getAllChains();
        setChain(AllChains[selectedChain]);
      } catch (err) {
        console.warn("Error fetching chains:", err);
      }
    };
    const fetchTokenDetails = async () => {
      try {

        // Attach a runner to the contract for read calls
        const contractWithRunner = contract.connect(provider);
        const token = await contractWithRunner.token();
        setStakeToken(token);

        const tokenContractWithRunner = tokenContract.connect(provider);
        const balance = await tokenContractWithRunner.balanceOf(walletAddress);

        setTokenBalance(Number(ethers.utils.formatUnits(balance, 18)));

      } catch (err) {
        console.warn("Error fetching token details:", err);
      }
    };
    fetchTokenDetails()
    fetchChains();
  }, [selectedChain, provider]);


  const getStakes = async () => {
    if (!walletAddress || !contract) return;

    try {
      const stakeCount = await contract.getUserStakeCount(walletAddress);
      const totalStakes = stakeCount && typeof stakeCount.toNumber === 'function' ? stakeCount.toNumber() : Number(stakeCount);
      const stakes = [];
      let rewards = ethers.BigNumber.from(0);

      for (let i = 0; i < totalStakes; i++) {
        const stake = await contract.stakes(walletAddress, i);
        const reward = await contract.pendingRewards(walletAddress, i);
        rewards = rewards.add(reward);
        stakes.push({
          amount: ethers.utils.formatUnits(stake.amount, 18),
          duration: (stake.duration && typeof stake.duration.toString === 'function') ? stake.duration.toString() : String(stake.duration),
          startTime: new Date(((stake.startTime && typeof stake.startTime.toNumber === 'function') ? stake.startTime.toNumber() : Number(stake.startTime)) * 1000).toLocaleString(),
          index: i,
        });
      }

      setPendingRewards(ethers.utils.formatUnits(rewards, 18));
      setStakeRecord(stakes);
    } catch (error) {
      console.warn("Error fetching stake information:", error);
    }
  };

  useEffect(() => {
    if ((!walletAddress || !chain) && (!claiming || !unstaking || !staking)) return;
    getStakes();
  }, [walletAddress, chain, claiming, unstaking, staking]);


  const handleApprove = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      return console.warn("Invalid approval amount");
    }

    try {
      setApproving(true)

      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);
      const walletSigner = new ethers.Wallet(privateKey, provider);
      const tokenWithSigner = tokenContract.connect(walletSigner);

      const txResponse = await tokenWithSigner.approve(
        stakingContracts[selectedChain],
        ethers.utils.parseUnits(amount, 18)
      );
      message.success(`Approval transaction sent: ${txResponse.hash}`);

      await txResponse.wait();
      setApproval(true)
      message.success("Approval successful!");
      setApproving(false)
    } catch (error) {
      console.warn("Error approving tokens:", error);
      setApproval(false)
      setApproving(false)
      message.error("Approval failed!");
    }
  };
  const handleStake = async (duration) => {
    if (!amount || isNaN(amount) || amount <= 0) {
      return console.warn("Invalid stake amount");
    }

    try {
      setStaking(true);
      const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);
      const walletSigner = new ethers.Wallet(privateKey, provider);

      const contractWithSigner = contract.connect(walletSigner);

      const txResponse = await contractWithSigner.stake(
        ethers.utils.parseUnits(amount, 18),
        duration
      );

      message.success("Staking transaction sent:", txResponse.hash);
      await txResponse.wait();
      message.success("Staking successful!");
      setApproval(false)
      setAmount('');
      getStakes();
      setStaking(false);
    } catch (error) {
      console.warn("Error staking tokens:", error);
      message.error("Staking failed!",error);
      setStaking(false);
    }
  };

  const handleUnstake = async (index) => {
    try {
      setUnstaking(true);
      const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);
      const walletSigner = new ethers.Wallet(privateKey, provider);

      const contractWithSigner = contract.connect(walletSigner);

      const txResponse = await contractWithSigner.unstake(index);

      message.success("Unstaking transaction sent:", txResponse.hash);
      await txResponse.wait();
      message.success("Unstaking successful!");

      getStakes();
      setUnstaking(false);
    } catch (error) {
      setUnstaking(false);
      console.warn("Error unstaking:", error);
      message.error("Unstaking failed!");
    }
  };

  const claimReward = async (index) => {
    try {
      setClaiming(true);
      const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
      const walletData = await getWalletData(walletAddress);
      const privateKey = await decryptData(walletData.walletKey);
      const walletSigner = new ethers.Wallet(privateKey, provider);

      const contractWithSigner = contract.connect(walletSigner);

      const txResponse = await contractWithSigner.claimReward(index);

      message.success("Reward claim transaction sent:", txResponse.hash);
      await txResponse.wait();
      message.success("Reward claiming successful!");

      getStakes();
      setClaiming(false);
    } catch (error) {
      setClaiming(false);
      console.warn("Error unstaking:", error);
      message.error("Reward Claiming failed!");
    }
  };
  if (!provider) {
    console.warn("Provider not initialized");
    return <Spin spinning={!provider} tip="Loading Interface..."></Spin>;
  }
  return (
    <Container className="mt-4">
      <Card className="p-4 shadow">
        <Card.Title><i>Token Address:</i>{stakeToken}</Card.Title>
        <Card.Title><i>Token Balance:</i>{tokenBalance}</Card.Title>
        <Card.Title><b>Staking Dashboard</b></Card.Title>
        <Form className='stakingform'>
          <Form.Group className="mb-3">
            <Form.Label><b>Amount to Stake</b></Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Form.Group>
        </Form>
        {approval ?
          <>
            <Button variant="primary" className="me-2" onClick={() => handleStake(31536000)}>Stake 12M</Button>
            <Button variant="primary" className="me-2" onClick={() => handleStake(63072000)}>Stake 24M</Button>
            <Button variant="primary" className="me-2" onClick={() => handleStake(94608000)}>Stake 36M</Button>
          </>
          :
          <Button variant="primary" className="Approvebtn me-2" onClick={handleApprove}>Approve Tokens for Staking</Button>
        }

        {(claiming || unstaking || approving || staking) && <Card.Text className="mt-3">Please Wait........</Card.Text>}

        <h4 className='stakingtitle mt-4'>Staking History</h4>
        <Table className="historytabel table-bordered">
          <thead>
            <tr>
              <th>#</th>
              <th>Amount</th>
              <th>Duration (Days)</th>
              <th>Start Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stakeRecord.length === 0 ? (
              <tr>
                <td colSpan="5">No stakes found</td>
              </tr>
            ) : (
              stakeRecord.map((stake, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>
                  <td>{stake.amount}</td>
                  <td>{(stake.duration / 86400).toFixed(3)}</td>
                  <td>{stake.startTime}</td>
                  <td>
                    <button type="button" className="btn btn-primary" onClick={() => claimReward(index)}>Reward</button>
                    <br />
                    <button type="button" className="btn btn-primary" onClick={() => handleUnstake(index)}>Unstake</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>

        <div className='Pendingtext'>
          <Card.Text className="mt-3">Pending Rewards: {pendingRewards} Tokens</Card.Text>
        </div>
      </Card>
    </Container>
  );
};

export default Staking;