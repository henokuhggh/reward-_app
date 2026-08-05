import React, { useState } from 'react';
import BingoStakeStep from './BingoStakeStep.jsx';
import BingoCartelStep from './BingoCartelStep.jsx';
import BingoGameStep from './BingoGameStep.jsx';

// The three-step flow the user asked for:
//   1. pick a prize tier (10/20/50/100 birr)
//   2. pick a cartel from the pool for that round (see how many
//      players + how much birr is already in)
//   3. play the live game once it starts
export default function BingoScreen({ user, onBalanceChange }) {
  const [step, setStep] = useState('stake'); // 'stake' | 'cartel' | 'game'
  const [stake, setStake] = useState(null);
  const [roundId, setRoundId] = useState(null);

  function handleStakeChosen(chosenStake) {
    setStake(chosenStake);
    setStep('cartel');
  }

  function handleJoined(joinedRoundId) {
    setRoundId(joinedRoundId);
    setStep('game');
  }

  function handleExitGame() {
    setStep('stake');
    setStake(null);
    setRoundId(null);
  }

  return (
    <div className="bingo-screen">
      {step === 'stake' && <BingoStakeStep onChoose={handleStakeChosen} />}

      {step === 'cartel' && stake && (
        <BingoCartelStep
          stake={stake}
          user={user}
          onBack={() => setStep('stake')}
          onJoined={handleJoined}
          onBalanceChange={onBalanceChange}
        />
      )}

      {step === 'game' && roundId && (
        <BingoGameStep roundId={roundId} onExit={handleExitGame} onBalanceChange={onBalanceChange} />
      )}

      <style>{`
        .bingo-screen {
          padding: 20px 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .screen-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .screen-subtitle {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: -8px;
        }
        .error-text {
          font-size: 12.5px;
          color: var(--danger);
        }
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .back-link {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          align-self: flex-start;
        }
      `}</style>
    </div>
  );
}
