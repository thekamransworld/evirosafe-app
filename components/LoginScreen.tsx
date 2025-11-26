
import React, { useState } from 'react';
import { useAppContext } from '../contexts';
import { logoSrc } from '../config';
import { Button } from './ui/Button';

const SignupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { invitedEmails, handleSignUp, usersList } = useAppContext();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [verifiedUser, setVerifiedUser] = useState<{ name: string } | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleVerifyEmail = () => {
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        setIsLoading(true);
        setError('');

        // Simulate network delay
        setTimeout(() => {
            const emailExistsInUsers = usersList.some(u => u.email.toLowerCase() === email.toLowerCase());
            if (emailExistsInUsers) {
                setError('An account with this email already exists.');
                setIsLoading(false);
                return;
            }

            const invitedUser = invitedEmails.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (invitedUser) {
                setVerifiedUser({ name: invitedUser.name });
                setStep(2);
            } else {
                setError('This email address has not been invited or has already been registered.');
            }
            setIsLoading(false);
        }, 500);
    };

    const handleCreateAccount = () => {
        setIsLoading(true);
        handleSignUp(email);
        // The context will show a toast and may or may not log the user in.
        // We can close the modal immediately.
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold">{step === 1 ? 'Create Your Account' : 'Welcome!'}</h3>
                    <p className="text-sm text-text-secondary">{step === 1 ? 'Enter your email to verify your invitation.' : `Confirm your details to create your account.`}</p>
                </div>
                <div className="p-6 space-y-4">
                    {step === 1 ? (
                        <>
                            <div>
                                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input
                                    type="email"
                                    id="signup-email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="mt-1 w-full p-2 border bg-transparent rounded-md"
                                    placeholder="your.email@example.com"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <p className="text-lg">Welcome, <span className="font-bold">{verifiedUser?.name}</span>!</p>
                            <p className="text-text-secondary">Your email <span className="font-semibold">{email}</span> has been verified.</p>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    {step === 1 ? (
                        <Button onClick={handleVerifyEmail} disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify Email'}
                        </Button>
                    ) : (
                        <Button onClick={handleCreateAccount} disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Account'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};


export const LoginScreen: React.FC = () => {
  const { usersList, login } = useAppContext();
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // Only users who have signed up should be in the list
  const selectableUsers = usersList.filter(u => u.status === 'active' || u.status === 'pending_approval');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="text-center mb-8">
        <img src={logoSrc} alt="EviroSafe Logo" className="w-16 h-16 rounded-lg mx-auto mb-4"/>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-green to-electric-blue text-transparent bg-clip-text">Welcome to EviroSafe</h1>
        <p className="text-text-secondary mt-2">Select a user profile to log in.</p>
      </div>
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">Choose your profile:</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {selectableUsers.map(user => (
            <button
              key={user.id}
              onClick={() => login(user.id)}
              className="w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 bg-gray-50 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-white/10 border border-transparent hover:border-primary-300"
            >
              <img className="h-12 w-12 rounded-full object-cover" src={user.avatar_url} alt={`${user.name}'s avatar`} />
              <div className="ml-4">
                <p className="font-semibold text-text-primary dark:text-dark-text-primary">{user.name}</p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{user.role.replace(/_/g, ' ')}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 text-center">
             <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Have an invitation?{' '}
                <button onClick={() => setIsSignupModalOpen(true)} className="font-semibold text-primary-600 hover:underline">
                    Create your account.
                </button>
            </p>
        </div>
      </div>
      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-8">This is a simulated login for demonstration purposes.</p>

      {isSignupModalOpen && <SignupModal onClose={() => setIsSignupModalOpen(false)} />}
    </div>
  );
};
