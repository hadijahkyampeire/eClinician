import { createTheme } from '@mui/material/styles'

/**
 * Material's defaults are Roboto and its own blue; this app is system-ui and whatever
 * colour the signed-in session resolved to. The theme hands MUI those two, so a Button
 * beside a `.btn` is the same button and the console repaints with everything else.
 *
 * The palette still needs literal colours — MUI computes contrast from them and cannot
 * read a CSS variable — so the house teal is the literal, and the component overrides
 * put --dept back on top wherever it is the thing you actually see.
 */
export const theme = createTheme({
  palette: { primary: { main: '#0f766e' }, error: { main: '#dc2626' } },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'inherit',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            background: 'var(--dept)',
            '&:hover': { background: 'var(--dept-dark)' },
            // The variant paints unconditionally, so disabled has to say so itself.
            '&.Mui-disabled': { background: 'rgba(0, 0, 0, 0.12)', color: 'rgba(0, 0, 0, 0.26)' },
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            color: 'var(--dept)',
            borderColor: 'color-mix(in srgb, var(--dept) 38%, transparent)',
            '&:hover': { borderColor: 'var(--dept)', background: 'var(--dept-bg)' },
          },
        },
        { props: { variant: 'text', color: 'primary' }, style: { color: 'var(--dept)' } },
      ],
    },
    MuiCheckbox: {
      styleOverrides: { root: { '&.Mui-checked': { color: 'var(--dept)' } } },
    },
    MuiChip: {
      variants: [{
        props: { variant: 'outlined', color: 'primary' },
        style: { color: 'var(--dept)', borderColor: 'var(--dept)' },
      }],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--dept)' } },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { '&.Mui-focused': { color: 'var(--dept)' } } } },
  },
})
