import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import type {
  FirmwareUpdatePlan,
  FirmwareUpdateV4Params,
  FirmwareUpdateV4Target,
} from '@onekeyfe/hd-core';

export type FirmwarePlanArtifactOverrides = Partial<
  Record<FirmwareUpdateV4Target, ArrayBuffer>
>;

export type FirmwareUpdatePlanBinaryParams = Pick<
  FirmwareUpdateV4Params,
  | 'targetsToUpdate'
  | 'bootloaderBinary'
  | 'applicationP1Binary'
  | 'applicationP2Binary'
  | 'coprocessorBinary'
  | 'se01Binary'
  | 'se02Binary'
  | 'se03Binary'
  | 'se04Binary'
  | 'resourceArchiveBinary'
>;

const PLAN_TARGET_BINARY_FIELDS = {
  boot: 'bootloaderBinary',
  app_v1: 'applicationP1Binary',
  app_v2: 'applicationP2Binary',
  coprocessor: 'coprocessorBinary',
  se01: 'se01Binary',
  se02: 'se02Binary',
  se03: 'se03Binary',
  se04: 'se04Binary',
  resource: 'resourceArchiveBinary',
} as const;

type PlanBinaryTarget = keyof typeof PLAN_TARGET_BINARY_FIELDS;
type PlanBinaryField = typeof PLAN_TARGET_BINARY_FIELDS[PlanBinaryTarget];

const isPlanBinaryTarget = (target: string): target is PlanBinaryTarget =>
  Object.prototype.hasOwnProperty.call(PLAN_TARGET_BINARY_FIELDS, target);

const verifyArtifact = (
  artifact: FirmwareUpdatePlan['artifacts'][number],
  binary: ArrayBuffer
) => {
  if (
    artifact.expectedSize !== undefined &&
    binary.byteLength !== artifact.expectedSize
  ) {
    throw new Error(`Firmware artifact size mismatch: ${artifact.artifactId}`);
  }
  const digest = bytesToHex(sha256(new Uint8Array(binary)));
  if (
    artifact.expectedSha256 !== undefined &&
    digest !== artifact.expectedSha256.toLowerCase()
  ) {
    throw new Error(
      `Firmware artifact SHA-256 mismatch: ${artifact.artifactId}`
    );
  }
};

export async function loadFirmwareUpdatePlanBinaries({
  plan,
  overrides = {},
}: {
  plan: FirmwareUpdatePlan;
  overrides?: FirmwarePlanArtifactOverrides;
}): Promise<FirmwareUpdatePlanBinaryParams> {
  if (plan.artifacts.length === 0) {
    throw new Error('Firmware update Plan has no artifacts');
  }

  const loaded = await Promise.all(
    plan.artifacts.map(async (artifact) => {
      if (!isPlanBinaryTarget(artifact.target)) {
        throw new Error(
          `Firmware update Plan target is not a V4 binary: ${artifact.target}`
        );
      }
      const field: PlanBinaryField = PLAN_TARGET_BINARY_FIELDS[artifact.target];
      const override = overrides[artifact.target];
      let binary: ArrayBuffer;
      if (override) {
        binary = override;
      } else {
        const response = await fetch(artifact.url);
        if (!response.ok) {
          throw new Error(
            `Failed to download firmware artifact ${artifact.artifactId}: ${response.status}`
          );
        }
        binary = await response.arrayBuffer();
      }
      verifyArtifact(artifact, binary);
      return { target: artifact.target, field, binary };
    })
  );

  const binaries: FirmwareUpdatePlanBinaryParams = {
    targetsToUpdate: [],
  };
  const loadedTargets: FirmwareUpdateV4Target[] = [];
  for (const item of loaded) {
    if (binaries[item.field]) {
      throw new Error(
        `Firmware update Plan has duplicate target ${item.target}`
      );
    }
    binaries[item.field] = item.binary;
    loadedTargets.push(item.target);
  }

  binaries.targetsToUpdate = Array.from(new Set(loadedTargets));
  return binaries;
}
