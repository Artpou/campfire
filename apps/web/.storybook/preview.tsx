import type { Preview } from "@storybook/react";
import React from "react";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        light: {
          name: "light",
          value: "#ffffff",
        },

        dark: {
          name: "dark",
          value: "#252525",
        }
      }
    },
  },

  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],

  initialGlobals: {
    backgrounds: {
      value: "light"
    }
  }
};

export default preview;

