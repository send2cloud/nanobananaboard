import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoryboardFlow from './StoryboardFlow';
import { Provider } from '../types';

// Mock ReactFlow to avoid canvas rendering issues in test environment
vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow');
  return {
    ...actual,
    ReactFlow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNodesState: (initial: any) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: any) => [initial, vi.fn(), vi.fn()],
    useReactFlow: () => ({
      fitView: vi.fn(),
      getNodes: vi.fn(() => []),
      project: vi.fn(),
    }),
    Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Controls: () => <div>Controls</div>,
    Background: () => <div>Background</div>,
  };
});

describe('Nano Banana Storyboarder Feature Tests', () => {
  
  beforeEach(() => {
    // Clear local storage to ensure we test defaults
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the application title', () => {
    render(<StoryboardFlow />);
    expect(screen.getByText(/Nano Banana/i)).toBeInTheDocument();
    expect(screen.getByText(/Storyboarder/i)).toBeInTheDocument();
  });

  it('opens Global Settings and shows correct version number', async () => {
    render(<StoryboardFlow />);
    
    // Find settings button
    const settingsBtn = screen.getByText(/Settings/i);
    fireEvent.click(settingsBtn);

    // Check for version number (Feature Request: "Add version number")
    await waitFor(() => {
        expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    });
  });

  it('defaults to OpenRouter (Custom) and hides Google/OpenAI initially', async () => {
    render(<StoryboardFlow />);
    
    // Open Settings
    const settingsBtn = screen.getByText(/Settings/i);
    fireEvent.click(settingsBtn);

    await waitFor(() => {
        // "OpenRouter" should be visible (as it's the Custom provider)
        const openRouterTabs = screen.getAllByText(/OpenRouter/i);
        expect(openRouterTabs.length).toBeGreaterThan(0);
        
        // "Nano Banana" (Google) should NOT be visible as a tab yet (disabled by default)
        // Note: The text might exist in the toggle description, so we check tabs specifically or absence of the tab class
        const googleTab = screen.queryByRole('button', { name: 'Nano Banana' });
        expect(googleTab).not.toBeInTheDocument();

        // "OpenAI" should NOT be visible anywhere (Feature Request: "Remove open AI tab")
        const openAiTab = screen.queryByText('OpenAI');
        expect(openAiTab).not.toBeInTheDocument();
    });
  });

  it('enables Google Models when toggle is clicked', async () => {
    render(<StoryboardFlow />);
    
    // Open Settings
    fireEvent.click(screen.getByText(/Settings/i));

    await waitFor(() => {
        expect(screen.getByText('Enable Google Models')).toBeInTheDocument();
    });

    // Find the toggle button (it has the ToggleLeft/Right icon)
    // We can find it by the container text or role. 
    // The button is a sibling to the text description.
    const enableText = screen.getByText('Enable Google Models');
    const toggleContainer = enableText.closest('div')?.parentElement;
    const toggleBtn = toggleContainer?.querySelector('button');
    
    expect(toggleBtn).toBeInTheDocument();
    
    // Click to Enable
    fireEvent.click(toggleBtn!);

    // Now Nano Banana tab should appear
    await waitFor(() => {
        const googleTab = screen.getByRole('button', { name: 'Nano Banana' });
        expect(googleTab).toBeInTheDocument();
    });
  });

  it('verifies Source Node (Refiner) button exists', () => {
    render(<StoryboardFlow />);
    // Feature Request: "refiner"
    const refinerBtn = screen.getByText(/Refiner \+/i);
    expect(refinerBtn).toBeInTheDocument();
  });

});