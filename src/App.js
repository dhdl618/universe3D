import { useEffect, useRef, useState } from 'react';
import './App.css';
import Loading from './component/Loading';
import ThreeCanvas from './component/ThreeCanvas';

function App() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="App">
      {isLoading && <Loading />}
      <ThreeCanvas onLoadComplete={() => setIsLoading(false)}/>
    </div>
  );
}

export default App;
