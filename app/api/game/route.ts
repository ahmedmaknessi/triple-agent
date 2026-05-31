import { NextRequest, NextResponse } from 'next/server';
import { checkDiscussionExpiry } from '@/actions/discussion.actions';
import { checkVotingExpiry }     from '@/actions/voting.actions';

/**
 * Called by the client (via setInterval) to advance timer-gated phases.
 * GET /api/game?room=ABCD
 */
export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get('room');
  if (!roomCode) return NextResponse.json({ error: 'Missing room' }, { status: 400 });

  const advancedDiscussion = await checkDiscussionExpiry(roomCode);
  const advancedVoting     = await checkVotingExpiry(roomCode);

  return NextResponse.json({ advancedDiscussion, advancedVoting });
}
