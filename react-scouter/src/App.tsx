import { useState } from 'react';
import LandingPage from './components/LandingPage';
import type { DetailedTechData, PowerLevelResult } from './types/github';
import './App.css';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<PowerLevelResult | null>(null);
  const [detailedTechData, setDetailedTechData] =
    useState<DetailedTechData | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [currentUsernames, setCurrentUsernames] = useState<string[]>([]);

  const handleScan = (usernames: string[]) => {
    setCurrentUsernames(usernames);
    setIsScanning(true);
    setScanData(null);
    setDetailedTechData(null);
  };

  const handleScanComplete = (
    data: PowerLevelResult,
    techData: DetailedTechData
  ) => {
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
      usernames={currentUsernames}
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
