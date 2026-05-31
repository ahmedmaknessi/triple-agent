import { GameShell } from './GameShell';

interface PageProps {
  params: { code: string };
}

export default function RoomPage({ params }: PageProps) {
  return <GameShell code={params.code.toUpperCase()} />;
}

export function generateStaticParams() {
  return [];
}
