import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface AuthError {
  code: string;
  message: string;
}

export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { user: credential.user, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  /**
   * Create new user account
   */
  static async signUp(email: string, password: string, displayName?: string): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName && credential.user) {
        await updateProfile(credential.user, { displayName });
      }
      
      return { user: credential.user, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { 
        user: null, 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { 
        error: { 
          code: error.code, 
          message: this.getErrorMessage(error.code) 
        } 
      };
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Convert Firebase Auth error codes to user-friendly messages
   */
  private static getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}
