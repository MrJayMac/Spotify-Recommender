import React, { useState } from 'react'

const Login = () => {
  const [signUp, setSignUp] = useState(false)
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    setSignUp(true);
  }

  return (
    <div>
        <form>
            <label>Username</label>
            <input type='text'></input>
            <label>Password</label>
            <input type='password'></input>
            {signUp && (
            <input
              type="password"
            />
          )}
        </form>
        <button onClick={handleSubmit}>Sign Up</button>
    </div>
  )
}

export default Login