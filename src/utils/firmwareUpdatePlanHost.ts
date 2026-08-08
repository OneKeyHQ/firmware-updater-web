import JSZip from 'jszip';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { prepareFirmwareUpdateV4MemoryHost } from '@onekeyfe/hd-core';

import type {
  CoreApi,
  FirmwareMemoryArtifact,
  FirmwareUpdatePlan,
  FirmwareUpdateV4MemoryHost,
  FirmwareUpdateV4Target,
} from '@onekeyfe/hd-core';

export type FirmwarePlanArtifactOverrides = Partial<
  Record<FirmwareUpdateV4Target, ArrayBuffer>
>;

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

const materializeZipEntries = async (binary: ArrayBuffer) => {
  const zip = await JSZip.loadAsync(binary);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length === 0 || entries.length > 512) {
    throw new Error('Firmware ZIP entry set is invalid');
  }
  return Promise.all(
    entries.map(async (entry) => ({
      entryName: entry.name,
      binary: await entry.async('arraybuffer'),
    }))
  );
};

async function downloadFirmwareUpdatePlanArtifacts({
  plan,
  overrides = {},
}: {
  plan: FirmwareUpdatePlan;
  overrides?: FirmwarePlanArtifactOverrides;
}): Promise<FirmwareMemoryArtifact[]> {
  return Promise.all(
    plan.artifacts.map(async (artifact) => {
      const override = overrides[artifact.target as FirmwareUpdateV4Target];
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
      return {
        artifactId: artifact.artifactId,
        binary,
        ...(artifact.container === 'zip'
          ? { materializedEntries: await materializeZipEntries(binary) }
          : {}),
      };
    })
  );
}

export async function prepareFirmwareUpdatePlanMemoryHost({
  hardwareSDK,
  plan,
  overrides = {},
}: {
  hardwareSDK: CoreApi;
  plan: FirmwareUpdatePlan;
  overrides?: FirmwarePlanArtifactOverrides;
}): Promise<FirmwareUpdateV4MemoryHost> {
  const artifacts = await downloadFirmwareUpdatePlanArtifacts({
    plan,
    overrides,
  });
  return prepareFirmwareUpdateV4MemoryHost({
    sdk: hardwareSDK,
    plan,
    artifacts,
  });
}
