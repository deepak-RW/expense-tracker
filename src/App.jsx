import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Eye, EyeOff, Trash2, Wallet, TrendingUp,
  TrendingDown, Loader2, MailCheck,
  Banknote, Coins, DollarSign
} from 'lucide-react';
import './App.css';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env?.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env?.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('expense');
  const [showBalance, setShowBalance] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [initialBudget, setInitialBudget] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
        setVerificationSent(false);
      } else {
        setTransactions([]);
        setInitialBudget(0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    const { data: transData } = await supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (transData) setTransactions(transData);

    const { data: profileData } = await supabase.from('profiles').select('starting_balance').eq('id', userId).single();
    if (profileData) setInitialBudget(profileData.starting_balance);
    else await supabase.from('profiles').insert([{ id: userId, starting_balance: 0 }]);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) alert(error.message);
      else if (data.user && !data.session) setVerificationSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  const updateBudgetInDB = async (val) => {
    const num = val === '' ? 0 : parseFloat(val);
    setInitialBudget(num);
    await supabase.from('profiles').update({ starting_balance: num }).eq('id', session.user.id);
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!description || !amount || numericAmount <= 0) return;

    const newEntry = { description, amount: numericAmount, type: transactionType, user_id: session.user.id };
    const { data, error } = await supabase.from('transactions').insert([newEntry]).select();
    if (!error) {
      setTransactions([data[0], ...transactions]);
      setDescription('');
      setAmount('');
    }
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(transactions.filter((t) => t.id !== id));
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const currentBalance = initialBudget + totalIncome - totalExpenses;

  if (loading) return <div className="loader-container"><Loader2 className="spin" size={40} /></div>;

  const FloatingBG = () => (
    <div className="bg-decor">
      <Banknote className="floating-symbol" size={50} style={{ left: '5%', animationDelay: '0s' }} />
      <Coins className="floating-symbol" size={35} style={{ left: '20%', animationDelay: '4s' }} />
      <DollarSign className="floating-symbol" size={45} style={{ left: '40%', animationDelay: '7s' }} />
      <Banknote className="floating-symbol" size={55} style={{ left: '60%', animationDelay: '2s' }} />
      <Coins className="floating-symbol" size={30} style={{ left: '80%', animationDelay: '5s' }} />
      <DollarSign className="floating-symbol" size={40} style={{ left: '95%', animationDelay: '9s' }} />
    </div>
  );

  if (!session) {
    return (
      <div className="login-page-wrapper">
        <FloatingBG />
        <div className="login-container">
          <div className="login-box">
            {verificationSent ? (
              <div className="auth-header">
                <MailCheck size={60} color="#2563eb" />
                <h2>Verify Email</h2>
                <p>Check your email <strong>{email}</strong>.</p>
                <button className="auth-btn" style={{ marginTop: '20px' }} onClick={() => setVerificationSent(false)}>Back to Login</button>
              </div>
            ) : (
              <>
                <div className="auth-header">
                  <div className="logo-box"><Wallet color="white" size={34} /></div>
                  <h2>PocketGuard</h2>
                  <p>{isSignup ? 'Create your secure account' : 'Sign in to your wallet'}</p>
                </div>
                <form className="auth-form" onSubmit={handleAuth}>
                  <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <div className="password-wrapper">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </span>
                  </div>
                  <button type="submit" className="auth-btn">{isSignup ? 'Create Account' : 'Sign In'}</button>
                </form>
                <p className="auth-toggle-text">
                  {isSignup ? "Already have an account? " : "Don't have an account? "}
                  <span className="auth-link" onClick={() => setIsSignup(!isSignup)}>{isSignup ? 'Login' : 'Sign Up'}</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <FloatingBG />
      <div className="dashboard-container">
        <header className="main-header">
          <div className="brand">
            <div className="logo-small"><Wallet color="white" size={24} /></div>
            <h3>PocketGuard</h3>
          </div>
          <div className="user-info">
            <span className="user-email">{session.user.email}</span>
            <button className="logout-link" onClick={() => supabase.auth.signOut()}>LOGOUT</button>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-left">
            <div className="budget-setup-card">
              <label>WALLET STARTING BALANCE</label>
              <div className="budget-input-wrapper">
                <input
                  type={showBudget ? 'text' : 'password'}
                  className="budget-input-simple"
                  value={initialBudget === 0 ? '' : initialBudget}
                  onChange={(e) => updateBudgetInDB(e.target.value)}
                  placeholder="0.00"
                />
                <span className="eye-icon-budget" onClick={() => setShowBudget(!showBudget)}>
                  {showBudget ? <EyeOff size={20} /> : <Eye size={20} />}
                </span>
              </div>
            </div>

            <div className="balance-card">
              <div className="card-top">
                <span>Total Balance</span>
              </div>
              <div className="balance-amount-row">
                <h1>{showBalance ? `₹${currentBalance.toLocaleString()}` : '₹ ••••••'}</h1>
                <span onClick={() => setShowBalance(!showBalance)} style={{ cursor: 'pointer' }}>
                  {showBalance ? <EyeOff size={22} /> : <Eye size={22} />}
                </span>
              </div>
              <div className="balance-stats">
                <div className="stat inc"><TrendingUp size={18} /> ₹{totalIncome.toLocaleString()}</div>
                <div className="stat exp"><TrendingDown size={18} /> ₹{totalExpenses.toLocaleString()}</div>
              </div>
            </div>

            <div className="card add-card">
              <h4>Add Transaction</h4>
              <form onSubmit={addTransaction}>
                <div className="type-toggle">
                  <button type="button" className={transactionType === 'income' ? 'active inc' : ''} onClick={() => setTransactionType('income')}>Income</button>
                  <button type="button" className={transactionType === 'expense' ? 'active exp' : ''} onClick={() => setTransactionType('expense')}>Expense</button>
                </div>
                <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <button className={`add-btn ${transactionType}`}>Confirm {transactionType}</button>
              </form>
            </div>
          </div>

          <div className="dashboard-right">
            <div className="card history-card">
              <h4>Recent Activity</h4>
              <div className="transaction-list">
                {transactions.length === 0 ? <p className="empty-msg">No history found.</p> :
                  transactions.map((t) => (
                    <div key={t.id} className={`t-row ${t.type}`}>
                      <div className="t-info">
                        <span className="t-desc">{t.description}</span>
                        <small>{new Date(t.created_at).toLocaleDateString()}</small>
                      </div>
                      <div className="t-amt-box">
                        <span className="t-amt">₹{Number(t.amount).toLocaleString()}</span>
                        <Trash2 size={18} className="del-icon" onClick={() => deleteTransaction(t.id)} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;