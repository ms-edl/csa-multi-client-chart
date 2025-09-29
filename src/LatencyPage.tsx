import MultiDeviceLatencyChart from '../components/MultiDeviceLatencyChart';
import { ThemeProvider } from './ThemeContext';
import { AnimatedThemeToggle } from './components/AnimatedThemeToggle';
import './styles.css';

export default function LatencyPage() {
  return (
    <ThemeProvider>
      <div className="bg-surface-section min-h-screen flex items-center justify-center">
        <div className="w-full max-w-[1200px] p-4">
          <div className="flex justify-end mb-4">
            <AnimatedThemeToggle />
          </div>
          <MultiDeviceLatencyChart />
        </div>
      </div>
    </ThemeProvider>
  );
}

