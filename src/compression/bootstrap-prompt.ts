const BOOTSTRAP_PREAMBLE = `[CarryOver Checkpoint]

The following is a compressed context checkpoint from a previous conversation.
Read and retain it as background context for the user's next message.

For this message only:
- Do not continue the work or execute the step under "Continue From Here".
- Do not repeat the checkpoint, produce a solution, write code, or take any action.
- Reply in at most three short sentences: confirm that the context is understood,
  state what has been completed, and state what is ready to be picked up next.
- Then stop and wait for the user's next instruction.

Use the checkpoint to guide your response only after the user sends their next prompt.

`

export function buildBootstrapText(checkpoint: string): string {
  return BOOTSTRAP_PREAMBLE + checkpoint
}
