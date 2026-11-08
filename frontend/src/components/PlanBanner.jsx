import { Link } from 'react-router-dom';
import { useAuth } from '../auth.js';

export default function PlanBanner() {
  const { user } = useAuth();
  if (!user) return <p className="banner">You are using FileEase as a guest. <Link to="/login?mode=register">Create a free account</Link> to save presets and convert Word, Excel and PDF files.</p>;
  if (user.plan === 'PRO') return <p className="banner">Pro plan active. Thank you.</p>;
  return <p className="banner">Free plan. <Link to="/pricing">Get Pro</Link> for higher limits.</p>;
}
