import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.email;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card sticky top-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Stella College" className="h-10 w-10 object-contain" />
        <div className="flex flex-col leading-tight">
          <h1 className="font-display text-lg sm:text-xl font-bold gradient-text">Stella College</h1>
          <span className="text-[10px] sm:text-xs text-muted-foreground tracking-wide">AI Assignment Checker</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden sm:flex items-center gap-2">
              {avatar && (
                <img src={avatar} alt={name || ''} className="w-8 h-8 rounded-full border-2 border-primary/30" />
              )}
              <span className="text-sm text-muted-foreground truncate max-w-[140px]">{name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 border-border bg-muted/40 hover:bg-muted text-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </>
        ) : (
          <Button onClick={signInWithGoogle} size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <LogIn className="h-4 w-4" />
            Sign In with Google
          </Button>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
