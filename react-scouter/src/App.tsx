import { useState } from 'react';
import LandingPage from './components/LandingPage';
import type { DetailedTechData, PowerLevelResult } from './types/github';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<PowerLevelResult | null>(null);
  const [detailedTechData, setDetailedTechData] = useState<DetailedTechData | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  const handleScan = (username: string) => {
    setCurrentUsername(username);
    setIsScanning(true);
    setScanData(null);
    setDetailedTechData(null);
  };

  const handleScanComplete = (data: PowerLevelResult, techData: DetailedTechData) => {
    setScanData(data);
    setDetailedTechData(techData);
    setIsScanning(false);
  };

  const handleScanError = () => {
    setIsScanning(false);
    setScanData(null);
    setDetailedTechData(null);
  };

  const handleShowResume = () => {
    if (detailedTechData) {
      setIsResumeOpen(true);
    }
  };

  const handleCloseResume = () => {
    setIsResumeOpen(false);
  };

  return (
    <LandingPage 
      onScan={handleScan}
      isScanning={isScanning}
      scanData={scanData}
      username={currentUsername}
      onScanComplete={handleScanComplete}
      onScanError={handleScanError}
      onShowResume={handleShowResume}
      hasDetailedData={!!detailedTechData}
      isResumeOpen={isResumeOpen}
      onCloseResume={handleCloseResume}
      techData={detailedTechData}
    />
  );
}

export default App;