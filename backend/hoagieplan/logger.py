"""A colorful logger for the Hoagie Plan app.

Copyright © 2021-2024 Hoagie Club and affiliates.

Licensed under the MIT License. You may obtain a copy of the License at:

    https://github.com/hoagieclub/plan/blob/main/LICENSE.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

import logging
import os
import sys
from colorama import Fore, Style, init
from dotenv import load_dotenv

load_dotenv()
init(autoreset=True)


class ColorFormatter(logging.Formatter):
    """A custom log formatter that applies color based on the log level using the Colorama library.
    
    Attributes:
        LOG_COLORS (dict): A dictionary mapping log levels to their corresponding color codes.

    """

    # Colors for each log level
    LOG_COLORS = {
        logging.DEBUG: Fore.LIGHTMAGENTA_EX + Style.BRIGHT,
        logging.INFO: Fore.CYAN,
        logging.WARNING: Fore.YELLOW + Style.BRIGHT,
        logging.ERROR: Fore.RED + Style.BRIGHT,
        logging.CRITICAL: Fore.RED + Style.BRIGHT + Style.NORMAL,
    }

    # Colors for other parts of the log message
    TIME_COLOR = Fore.GREEN
    FILE_COLOR = Fore.BLUE
    LEVEL_COLOR = Style.BRIGHT

    def __init__(self, fmt=None):
        super().__init__(fmt or "%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s", "%Y-%m-%d %H:%M:%S")

    def format(self, record):
        """Format a log record with the appropriate color based on the log level.
        
        Args:
            record (logging.LogRecord): The log record to format.

        Returns:
            str: The formatted log message with colors applied.

        """
        # Apply color based on the log level
        level_color = self.LOG_COLORS.get(record.levelno, Fore.WHITE)
        time_str = f"{self.TIME_COLOR}{self.formatTime(record)}{Style.RESET_ALL}"
        levelname_str = f"{level_color}{record.levelname}{Style.RESET_ALL}"
        file_info_str = f"{self.FILE_COLOR}{record.filename}:{record.lineno}{Style.RESET_ALL}"

        # Format the log message with color
        log_msg = f"{time_str} - {levelname_str} - {file_info_str} - {record.msg}"
        return log_msg

def setup_logger():
    """Set up a logger with a custom color formatter that logs to standard output (stdout).
    
    The logger is configured with the ColorFormatter to format log messages with color based on the log level.
    The log level is set to INFO by default, but this can be changed to show more or less detailed messages.

    Returns:
        logging.Logger: A logger instance that logs formatted messages to stdout.
        
    """
    handler = logging.StreamHandler(sys.stdout)

    # Set custom formatter
    formatter = ColorFormatter()
    handler.setFormatter(formatter)
    logger = logging.getLogger(__name__)
    
    # Set to DEBUG to capture all logging levels
    DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")
    logger.setLevel(logging.DEBUG) if DEBUG else logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    logger.propagate = False  # Prevents multiple logging if re-initialized

    return logger

logger = setup_logger()  # Initialize once to prevent multiple loggers
