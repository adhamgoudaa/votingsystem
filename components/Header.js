import Link from 'next/link';
import { useWeb3 } from '../hooks/useWeb3';
import { Icons } from './Icons';
import styles from '../styles/Header.module.css';

export default function Header() {
  const { account, connect, disconnect, isAdmin } = useWeb3();

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}><Icons.Logo /></span>
          <span className={styles.logoText}>Boardroom Voting</span>
        </Link>
        
        <div className={styles.links}>
          {isAdmin && (
            <div className={styles.adminLinks}>
              <Link href="/create-proposal" className={styles.link}>
                <span className={styles.linkIcon}><Icons.CreateProposal /></span>
                Create Proposal
              </Link>
              <Link href="/register-voter" className={styles.link}>
                <span className={styles.linkIcon}><Icons.RegisterVoter /></span>
                Register Voter
              </Link>
            </div>
          )}
          <div className={styles.accountSection}>
            {account ? (
              <>
                <span className={styles.account}>
                  <span className={styles.accountIcon}><Icons.Account /></span>
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                  {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                </span>
                <button onClick={disconnect} className={styles.disconnectButton}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={connect} className={styles.connectButton}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
} 