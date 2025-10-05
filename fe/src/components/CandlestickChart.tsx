import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { CandlestickData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

interface CandlestickChartProps {
  data: CandlestickData[];
  symbol: string;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, symbol }) => {
  // Use closing prices for the line chart
  const closePrices = data.map(d => d.close);
  
  // Determine overall trend for color
  const firstPrice = closePrices[0];
  const lastPrice = closePrices[closePrices.length - 1];
  const isPositive = lastPrice >= firstPrice;
  const lineColor = isPositive ? '#22C55E' : '#EF4444';
  const gradientStart = isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const gradientEnd = isPositive ? 'rgba(34, 197, 94, 0)' : 'rgba(239, 68, 68, 0)';

  const chartData = {
    labels: data.map((d) => {
      const date = new Date(d.time);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: symbol,
        data: closePrices,
        borderColor: lineColor,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
          gradient.addColorStop(0, gradientStart);
          gradient.addColorStop(1, gradientEnd);
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: lineColor,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const candle = data[index];
            return [
              `Price: $${candle.close.toLocaleString()}`,
              `High: $${candle.high.toLocaleString()}`,
              `Low: $${candle.low.toLocaleString()}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 6,
          font: {
            size: 9,
          },
          color: '#9CA3AF',
        },
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          font: {
            size: 9,
          },
          color: '#9CA3AF',
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default CandlestickChart;

