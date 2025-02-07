import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [signUp, setSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const viewLogin = (status) => {
    setSignUp(status);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (signUp) {
      if (!email || !username || !password || !confirmPassword) {
        return setError('All fields are required.');
      }
      if (password !== confirmPassword) {
        return setError('Passwords do not match.');
      }

      try {
        const response = await axios.post('http://localhost:8000/register', {
          username,
          password,
          email
        });

        if (response.status === 201) {
          console.log('Registration successful:', response.data);
          setSignUp(false);
        } else {
          setError(response.data.error || 'Something went wrong');
        }
      } catch (error) {
        setError(error.response?.data?.error || error.message);
      }
    } else {
      if (!username || !password) {
        return setError('Username and password are required.');
      }


      try {
        const response = await axios.post('http://localhost:8000/login', {
          username,
          password
        });

        if (response.status === 200) {
          console.log('Login successful:', response.data.token);
          localStorage.setItem('token', response.data.token); 
          navigate('/home');
        } else {
          setError(response.data.error || 'Invalid credentials');
        }
      } catch (error) {
        setError(error.response?.data?.error || error.message);
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {signUp && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {signUp && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        <button type="submit">{signUp ? 'Register' : 'Login'}</button>
      </form>

      <button onClick={() => viewLogin(true)}>Create an account</button>
      <button onClick={() => viewLogin(false)}>Already have an account?</button>

      {error && <p>{error}</p>}
    </div>
  );
};

export default Login;
