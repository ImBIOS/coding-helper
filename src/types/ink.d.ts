import "react";

declare module "ink" {
  interface TextProps {
    /** Display text in a dimmed color */
    dimmed?: boolean;
    /** Display text inline (not on its own line) */
    inline?: boolean;
  }
}
