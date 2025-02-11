import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import History from '../History/History.jsx';

const Dashboard = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('user_id'); 

  return (
    <div>
      <h1>Welcome to Your Dashboard</h1>
      {userId ? <History userId={userId} /> : <p>Loading user data...</p>}
    </div>
  );
};

export default Dashboard;
