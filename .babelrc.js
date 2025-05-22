module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { 
      runtime: 'classic', 
      development: true, 
      throwIfNamespace: false 
    }],
    '@babel/preset-typescript'
  ],
  plugins: []
}; 