export type PairingLogDetails = Record<string, string | number | boolean | null | undefined>;

export class PairingFlowError extends Error {
  code: string;
  details: PairingLogDetails;

  constructor(message: string, code: string, details: PairingLogDetails = {}) {
    super(message);
    this.name = 'PairingFlowError';
    this.code = code;
    this.details = details;
  }
}

export function toPairingDebugString(error: unknown) {
  if (error instanceof PairingFlowError) {
    const entries = Object.entries(error.details)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${String(value)}`);

    return [error.code, ...entries].join(' | ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function logPairingError(scope: string, error: unknown, extra: PairingLogDetails = {}) {
  if (error instanceof PairingFlowError) {
    console.error(`[pairing:${scope}] ${error.message}`, {
      code: error.code,
      details: {
        ...error.details,
        ...extra,
      },
    });
    return;
  }

  if (error instanceof Error) {
    console.error(`[pairing:${scope}] ${error.message}`, {
      name: error.name,
      stack: error.stack,
      details: extra,
    });
    return;
  }

  console.error(`[pairing:${scope}] unknown error`, {
    error,
    details: extra,
  });
}
