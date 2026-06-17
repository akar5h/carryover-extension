const BOOTSTRAP_PREAMBLE = `[CarryOver Checkpoint]

The following is a compressed context checkpoint from a previous conversation. Review it to restore context, then continue from the step described under "Continue From Here".

`

export function buildBootstrapText(checkpoint: string): string {
  return BOOTSTRAP_PREAMBLE + checkpoint
}
