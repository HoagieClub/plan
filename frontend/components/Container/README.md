# Container Component

A flexible, generic container component that can be styled and configured for various use cases. Built with TypeScript, React, and Tailwind CSS.

## Features

- **Generic Design**: Can be used as a base for cards, lists, grids, and more
- **Flexible Styling**: Base styling through Tailwind with full customization through className prop
- **Multiple Display Modes**: Supports vertical, horizontal, and grid layouts
- **Interactive States**: Built-in hover, focus, and placeholder states
- **Accessibility**: Proper ARIA attributes and keyboard navigation support
- **TypeScript**: Full type safety with proper prop typing

## Usage

```tsx
import { Container } from "./Container";

// Basic usage
<Container>
  <div>Content goes here</div>
</Container>

// With header and grid layout
<Container
  label="Grid Example"
  columns={2}
  className="w-full max-w-3xl"
>
  <div>Grid Item 1</div>
  <div>Grid Item 2</div>
</Container>

// Horizontal scrolling list
<Container
  horizontal
  scrollable
  label="Horizontal List"
>
  {items.map(item => (
    <div key={item.id}>{item.content}</div>
  ))}
</Container>

// Placeholder state
<Container
  placeholder
  onClick={handleClick}
>
  <div>Drop items here</div>
</Container>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Content to be rendered inside the container |
| `columns` | `number` | Number of columns for grid layout (default: 1) |
| `label` | `string \| ReactNode` | Optional header content |
| `horizontal` | `boolean` | Enable horizontal scrolling layout |
| `hover` | `boolean` | Enable hover state styles |
| `scrollable` | `boolean` | Enable scrolling for content |
| `shadow` | `boolean` | Add shadow to container |
| `placeholder` | `boolean` | Enable placeholder styling (useful for drag & drop) |
| `unstyled` | `boolean` | Remove default styling |
| `className` | `string` | Additional CSS classes to apply |
| `onClick` | `() => void` | Click handler (converts container to button) |
| `height` | `string \| number` | Custom height |
| `style` | `CSSProperties` | Additional inline styles |

## Styling

The component uses a combination of Tailwind CSS for basic styling and CSS modules for complex behaviors. The base styling is minimal and can be fully customized through the `className` prop using Tailwind classes.

```tsx
// Custom styling example
<Container
  className="w-full max-w-4xl bg-blue-50 hover:bg-blue-100 border-blue-200"
  label={
    <div className="flex items-center gap-2 text-blue-800">
      <Icon />
      <span>Custom Header</span>
    </div>
  }
>
  {/* Your content */}
</Container>
```

## Examples

The Container component can be used for various UI patterns:

- Semester bins (what HoagiePlan uses it for)
- Card grids
- Media galleries
- File explorers
- Timeline views
- Kanban boards
- Settings panels
- Documentation sidebars
- Form sections

Each use case can have its own unique styling while maintaining consistent behavior and accessibility.
