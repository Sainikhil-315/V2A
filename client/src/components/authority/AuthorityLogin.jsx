import React, { useState } from 'react';
import { Mail, Key, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authoritiesAPI } from '../../utils/api';

const AuthorityLogin = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authoritiesAPI.requestOtp({ email });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authoritiesAPI.verifyOtp({ email, otp });
      toast.success('Login successful!');
      onLogin(res.data.token, res.data.authority);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-purple-700 to-pink-500">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-6 tracking-tight">
          Authority Login
        </h2>
        <form onSubmit={step === 1 ? handleRequestOtp : handleVerifyOtp}>
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Email</label>
                <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                  <Mail className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="email"
                    className="bg-transparent outline-none flex-1 text-gray-900"
                    placeholder="authority@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center justify-center hover:scale-105 transition-transform"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Request OTP
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Enter OTP</label>
                <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                  <Key className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    className="bg-transparent outline-none flex-1 text-gray-900 tracking-widest"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    maxLength={6}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold flex items-center justify-center hover:scale-105 transition-transform"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Verify OTP & Login
              </button>
              <button
                type="button"
                className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-semibold mt-2 hover:bg-gray-50"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthorityLogin;
