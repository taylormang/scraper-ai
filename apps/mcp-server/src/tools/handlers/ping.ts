/**
 * Ping handler
 */

export async function handlePing(args: any) {
  const message = (args?.message as string) || 'pong';
  return {
    content: [
      {
        type: 'text',
        text: `🏓 ${message}`,
      },
    ],
  };
}
