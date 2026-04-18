import React, { useState, useEffect } from 'react';


const LiveClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update the time every second (1000 milliseconds)
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(timerId);
  }, []);

  // Format the time to match the UI design (e.g., OCTOBER 26, 2023 | 10:15 AM)
  const formattedTime = currentTime.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    // second: '2-digit', // Uncomment this if you want to see the seconds ticking
    hour12: true,
  }).toUpperCase();

  return (
    <div className="text-sm font-bold text-gray-800 tracking-wide">
      {formattedTime.replace(' AT', ' |')}
    </div>
  );
};

export default LiveClock;