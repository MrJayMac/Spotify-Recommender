import React, { useState } from 'react'

const Login = () => {
  const [signUp, setSignUp] = useState('')

  const handleSubmit = {

  }
  return (
    <div>
        <form>
            <label>Username</label>
            <input type='text'></input>
            <label>Password</label>
            <input type='text'></input>
        </form>
        <button onClick={handleSubmit}>Sign Up</button>
    </div>
  )
}

export default Login