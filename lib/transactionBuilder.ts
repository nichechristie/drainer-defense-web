import { namehash, Interface, parseUnits } from "ethers";
import { ENS_NAME_WRAPPER, ENS_PUBLIC_RESOLVER, GAS_LIMITS } from "./constants";
import { NAME_WRAPPER_ABI, PUBLIC_RESOLVER_ABI } from "./abis";
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
  };
}
