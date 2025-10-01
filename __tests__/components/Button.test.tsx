import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// 簡単なButtonコンポーネントのテスト例
const Button = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary' 
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${
      disabled ? 'btn-disabled' : ''
    }`}
    data-testid="button"
  >
    {children}
  </button>
)

describe('Button Component', () => {
  // 基本的なレンダリングテスト
  test('renders button with text', () => {
    render(<Button>クリックしてね</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('クリックしてね')
  })

  // クリックイベントのテスト
  test('calls onClick when clicked', async () => {
    const mockOnClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={mockOnClick}>クリック</Button>)
    
    const button = screen.getByTestId('button')
    await user.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  // 無効状態のテスト
  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>無効ボタン</Button>)
    
    const button = screen.getByTestId('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('btn-disabled')
  })

  // バリアント（見た目）のテスト
  test('applies correct variant class', () => {
    const { rerender } = render(<Button variant="primary">プライマリ</Button>)
    
    let button = screen.getByTestId('button')
    expect(button).toHaveClass('btn-primary')

    rerender(<Button variant="secondary">セカンダリ</Button>)
    
    button = screen.getByTestId('button')
    expect(button).toHaveClass('btn-secondary')
  })

  // スナップショットテスト（UIの変更検知）
  test('matches snapshot', () => {
    const { container } = render(
      <Button variant="primary" onClick={() => {}}>
        スナップショット用ボタン
      </Button>
    )
    
    expect(container.firstChild).toMatchSnapshot()
  })
})