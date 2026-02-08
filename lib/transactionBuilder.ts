import { namehash, Interface, parseUnits } from "ethers";
import { ENS_NAME_WRAPPER, ENS_PUBLIC_RESOLVER, GAS_LIMITS } from "./constants";
import { NAME_WRAPPER_ABI, PUBLIC_RESOLVER_ABI, ERC20_ABI, ERC721_ABI } from "./abis";
import type { TransactionTemplate, GasConfig } from "@/types/rescue";

export function buildEthRescue(
  safeAddress: string,
  gas: GasConfig
): TransactionTemplate {
  return {
    to: safeAddress,
    value: 0n, // computed at broadcast time
    gasLimit: GAS_LIMITS.eth_rescue,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    maxFeePerGas: gas.maxFeePerGas,
    type: 2,
    _action: "eth_rescue",
    _label: "Sweep ETH",
  };
}

export function buildEnsTransfer(
  fromAddress: string,
  ensName: string,
  safeAddress: string,
  gas: GasConfig
): TransactionTemplate {
  const node = namehash(ensName);
  const tokenId = BigInt(node);
  const iface = new Interface(NAME_WRAPPER_ABI);
  const data = iface.encodeFunctionData("safeTransferFrom", [
    fromAddress,
    safeAddress,
    tokenId,
    1n,
    "0x",
  ]);

  return {
    to: ENS_NAME_WRAPPER,
    data,
    value: 0n,
    gasLimit: GAS_LIMITS.ens_transfer,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    maxFeePerGas: gas.maxFeePerGas,
    type: 2,
    _action: "ens_transfer",
    _label: `Transfer ENS: ${ensName}`,
  };
}

export function buildEnsRecordUpdate(
  ensName: string,
  key: string,
  value: string,
  gas: GasConfig
): TransactionTemplate {
  const node = namehash(ensName);
  const iface = new Interface(PUBLIC_RESOLVER_ABI);
  const data = iface.encodeFunctionData("setText", [node, key, value]);

  return {
    to: ENS_PUBLIC_RESOLVER,
    data,
    value: 0n,
    gasLimit: GAS_LIMITS.ens_record,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    maxFeePerGas: gas.maxFeePerGas,
    type: 2,
    _action: "ens_record",
    _label: `Set ${key} on ${ensName}`,
  };
}

export function buildErc20Rescue(
  tokenAddress: string,
  safeAddress: string,
  amount: bigint,
  tokenSymbol: string,
  gas: GasConfig
): TransactionTemplate {
  const iface = new Interface(ERC20_ABI);
  const data = iface.encodeFunctionData("transfer", [safeAddress, amount]);

  return {
    to: tokenAddress,
    data,
    value: 0n,
    gasLimit: GAS_LIMITS.erc20_rescue,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    maxFeePerGas: gas.maxFeePerGas,
    type: 2,
    _action: "erc20_rescue",
    _label: `Rescue ${tokenSymbol}`,
  };
}

export function buildErc721Rescue(
  fromAddress: string,
  tokenAddress: string,
  tokenId: string,
  safeAddress: string,
  gas: GasConfig
): TransactionTemplate {
  const iface = new Interface(ERC721_ABI);
  const data = iface.encodeFunctionData("transferFrom", [
    fromAddress,
    safeAddress,
    BigInt(tokenId),
  ]);

  return {
    to: tokenAddress,
    data,
    value: 0n,
    gasLimit: GAS_LIMITS.erc721_rescue,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    maxFeePerGas: gas.maxFeePerGas,
    type: 2,
    _action: "erc721_rescue",
    _label: `Rescue NFT #${tokenId}`,
  };
}

export function buildApprovalRevoke(
  tokenAddress: string,
  spenderAddress: string,
  tokenSymbol: string,
  gas: GasConfig
): TransactionTemplate {
  const iface = new Interface(ERC20_ABI);
  const data = iface.encodeFunctionData("approve", [spenderAddress, 0n]);

  return {
    to: tokenAddress,
    data,
    value: 0n,
    gasLimit: GAS_LIMITS.approval_revoke,
    maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
    maxFeePerGas: gas.maxFeePerGas,
    type: 2,
    _action: "approval_revoke",
    _label: `Revoke ${tokenSymbol} approval for ${spenderAddress.slice(0, 8)}...`,
  };
}
