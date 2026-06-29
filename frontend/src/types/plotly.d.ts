// plotly.js-dist-min não publica tipos; declaramos o mínimo usado pelo wrapper.
declare module 'plotly.js-dist-min' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Plotly: any
  export default Plotly
}
