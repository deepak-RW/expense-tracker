import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Eye, EyeOff, Trash2, Wallet, TrendingUp,
  TrendingDown, Loader2, UserPlus, LogIn, MailCheck,
  Banknote, Coins, DollarSign
} from 'lucide-react';
import './App.css';

// Handle both Vite and Create React App environment variable naming
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
  const [verificationSent, setVerificationSent] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('expense');
  const [showBudget, setShowBudget] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [initialBudget, setInitialBudget] = useState(() => {
    return parseFloat(localStorage.getItem('my_budget')) || 0;
  });

  useEffect(() => {
    // 1. Initial check for session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTransactions(session.user.id);
      setLoading(false);
    });

    // 2. Listen for Auth State changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchTransactions(session.user.id);
        setVerificationSent(false); // If user is logged in, hide verification screen
      } else {
        setTransactions([]);
      }
      setLoading(false);
    });

    // 3. TAB SYNC LOGIC: Check session when user returns to this tab
    const syncSession = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setSession(session);
            fetchTransactions(session.user.id);
            setVerificationSent(false);
          }
        });
      }
    };

    window.addEventListener('visibilitychange', syncSession);
    window.addEventListener('focus', syncSession);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', syncSession);
      window.removeEventListener('focus', syncSession);
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email, 
        password, 
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) alert(error.message);
      else if (data.user && !data.session) setVerificationSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  const fetchTransactions = async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setTransactions(data);
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (!description || !amount || numericAmount <= 0) {
      alert("Please enter an amount greater than zero.");
      return;
    }

    const newEntry = {
      description,
      amount: Math.abs(numericAmount),
      type: transactionType,
      user_id: session.user.id
    };

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

  const updateBudget = (val) => {
    const num = val === '' ? 0 : parseFloat(val);
    setInitialBudget(num);
    localStorage.setItem('my_budget', num.toString());
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const currentBalance = initialBudget + totalIncome - totalExpenses;

  if (loading) return <div className="loader-container"><Loader2 className="spin" size={40} /></div>;

  const FloatingBG = () => (
    <div className="bg-decor">
      <Banknote className="floating-symbol" size={50} style={{ left: '10%', animationDelay: '0s' }} />
      <Coins className="floating-symbol" size={40} style={{ left: '30%', animationDelay: '4s' }} />
      <DollarSign className="floating-symbol" size={45} style={{ left: '50%', animationDelay: '7s' }} />
      <Banknote className="floating-symbol" size={60} style={{ left: '75%', animationDelay: '2s' }} />
      <Coins className="floating-symbol" size={35} style={{ left: '90%', animationDelay: '5s' }} />
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
                <p>We've sent a link to <strong>{email}</strong>.</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                   The dashboard will load automatically once you click the link in your email.
                </p>
                <button className="auth-btn" style={{ marginTop: '20px' }} onClick={() => setVerificationSent(false)}>Back to Login</button>
              </div>
            ) : (
              <>
                <div className="auth-header">
                  <div style={{ background: '#2563eb', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <Wallet color="white" size={34} />
                  </div>
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
                  {isSignup ? (
                    <>Already have an account? <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); setIsSignup(false); }}>Login</a></>
                  ) : (
                    <>Don't have an account? <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); setIsSignup(true); }}>Sign Up</a></>
                  )}
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
            <div style={{ background: '#2563eb', padding: '10px', borderRadius: '12px' }}>
              <Wallet color="white" size={28} />
            </div>
            <h3>PocketGuard</h3>
          </div>
          <div className="user-section">
            <span className="user-email">{session.user.email}</span>
            <button className="logout-link" onClick={() => supabase.auth.signOut()}>LOGOUT</button>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-left">
            <div className="budget-setup-card">
              <label>WALLET STARTING BALANCE</label>
              <div className="budget-input-wrapper">
                <input type={showBudget ? 'text' : 'password'} value={initialBudget === 0 ? '' : initialBudget} onChange={(e) => updateBudget(e.target.value)} placeholder="0.00" />
                <span className="eye-icon-budget" style={{ position: 'absolute', right: '15px', top: '10px', cursor: 'pointer', color: '#64748b' }} onClick={() => setShowBudget(!showBudget)}>
                  {showBudget ? <EyeOff size={20} /> : <Eye size={20} />}
                </span>
              </div>
            </div>

            <div className="balance-card">
              <div className="card-top">
                <span>Total Balance</span>
                <span style={{ cursor: 'pointer' }} onClick={() => setShowBalance(!showBalance)}>
                  {showBalance ? <EyeOff size={22} /> : <Eye size={22} />}
                </span>
              </div>
              <h1>{showBalance ? `₹${currentBalance.toLocaleString()}` : '₹ ••••••'}</h1>
              <div className="balance-stats">
                <div className="stat inc"><TrendingUp size={20} /> <span>₹{totalIncome.toLocaleString()}</span></div>
                <div className="stat exp"><TrendingDown size={20} /> <span>₹{totalExpenses.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '25px' }}>
              <h4 style={{ marginBottom: '20px' }}>Add Transaction</h4>
              <form onSubmit={addTransaction}>
                <div className="type-toggle">
                  <button type="button" className={transactionType === 'income' ? 'active income' : ''} onClick={() => setTransactionType('income')}>Transfer In</button>
                  <button type="button" className={transactionType === 'expense' ? 'active expense' : ''} onClick={() => setTransactionType('expense')}>Expense</button>
                </div>
                <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <button className={`add-btn ${transactionType}`}>Confirm {transactionType === 'income' ? 'Transfer' : 'Expense'}</button>
              </form>
            </div>
          </div>

          <div className="dashboard-right">
            <div className="card">
              <h4 style={{ marginBottom: '20px' }}>Recent Activity</h4>
              <ul className="transaction-list">
                {transactions.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontWeight: 600 }}>No history found.</p>}
                {transactions.map((t) => (
                  <li key={t.id} className={t.type}>
                    <div className="t-info">
                      <span className="t-text">{t.description} </span>
                      <small>{new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                    </div>
                    <div className="t-amount" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: t.type === 'income' ? '#10b981' : '#ef4444' }}>{t.type === 'income' ? '+' : '-'} ₹{Number(t.amount).toLocaleString()}</span>
                      <Trash2 size={18} className="del-icon" onClick={() => deleteTransaction(t.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;