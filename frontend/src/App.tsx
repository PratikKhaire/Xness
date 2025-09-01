import ChartView from './componets/ChartView'
import './App.css';

const App = () => {
  return (
    <div style={{ marginTop: 12 }}>
      <ChartView asset="BTCUSDT" interval="1d" rangeDays={14} />
    </div>
  );
};

export default App