import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path ='/' element={<Login/>}/>
        <Route path ='/home' element={<Dashboard/>}/>
      </Routes>
    </Router>
  )
}

export default App