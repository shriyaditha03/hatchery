import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Waves, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/aqua-nexus-logo.png';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginWithUsername, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await loginWithUsername(username, password);

    if (result.error) {
      toast.error(result.error.message || 'Login failed');
    } else {
      // Redirect based on role logic happens here if not handled by useEffect
      // However, fetchProfile updates 'user' state, so we can check it in a useEffect 
      // or here if we have the result from fetchProfile.
      // Let's rely on the useEffect for cleaner navigation after state update.
    }
    setLoading(false);
  };

  // Improved redirection logic
  useEffect(() => {
    if (user) {
      if (user.role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen ocean-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="AquaNexus" className="w-20 h-20 rounded-2xl mb-4" />
          <h1 className="text-2xl font-bold text-foreground">AquaNexus Login</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Waves className="w-4 h-4" /> <span>Intelligent Aquaculture</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-12 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          System Access for Owners and Staff
        </p>

        <div className="mt-8 pt-6 border-t text-center">
          <Link to="/owner/signup" className="text-sm text-primary hover:underline">Register Hatchery (Owner Only)</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
