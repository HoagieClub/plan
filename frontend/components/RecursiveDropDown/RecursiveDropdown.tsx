import { FC, useEffect, useState, useCallback, useRef } from 'react';

import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button as JoyButton } from '@mui/joy';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';

import useSearchStore from '@/store/searchSlice';

import LoadingComponent from '../LoadingComponent';
import SettingsModal from '../Modal';

import styles from '../InfoComponent/InfoComponent.module.scss';

interface Dictionary {
  [key: string]: any;
}

interface DropdownProps {
  data: Dictionary;
  csrfToken: string;
  checkRequirements: any;
}

interface SatisfactionStatusProps {
  satisfied: string;
  manuallySatisfied: string;
  count: number;
  minNeeded: number;
  maxCounted: number;
  isRestrictions: boolean;
}

const semesterMap = {
  1: 'Freshman fall',
  2: 'Freshman spring',
  3: 'Sophomore fall',
  4: 'Sophomore spring',
  5: 'Junior fall',
  6: 'Junior spring',
  7: 'Senior fall',
  8: 'Senior spring',
};

// Satisfaction status icon with styling
const SatisfactionStatus: FC<SatisfactionStatusProps> = ({
  satisfied,
  manuallySatisfied,
  count,
  minNeeded,
  maxCounted,
  isRestrictions,
}) => {
  if (manuallySatisfied) {
    return <CheckCircleOutlineIcon style={{ color: 'gray', marginLeft: '10px' }} />;
  }
  if (isRestrictions) {
    return <InfoOutlinedIcon style={{ color: 'blue', marginLeft: '10px' }} />;
  }
  if (maxCounted > 1) {
    return (
      <>
        {satisfied === 'True' ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 450, color: 'green' }}>{Math.floor(count / minNeeded)}</span>
            <AddCircleOutlineOutlinedIcon style={{ color: 'green', marginLeft: '10px' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 450, color: 'red' }}>
              {count}/{minNeeded}
            </span>
            <HighlightOffIcon style={{ color: 'red', marginLeft: '10px' }} />
          </div>
        )}
      </>
    );
  }
  return (
    <>
      {satisfied === 'True' ? (
        <CheckCircleOutlineIcon style={{ color: 'green', marginLeft: '10px' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 450, color: 'red' }}>
            {count}/{minNeeded}
          </span>
          <HighlightOffIcon style={{ color: 'red', marginLeft: '10px' }} />
        </div>
      )}
    </>
  );
};

// Dropdown component with refined styling
const Dropdown: FC<DropdownProps> = ({ data, csrfToken, checkRequirements }) => {
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [markedSatisfied, setMarkedSatisfied] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<{ [key: number]: any } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState(new Set());

  const handleChange = (event, key) => {
    if (event.type === 'keydown' && (event.key === 'Enter' || event.keyCode === 13)) {
      event.preventDefault(); // Prevent the default action
      return; // Exit without toggling the state
    }

    setExpanded((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  };

  const handleExplanationClick = (event, reqId) => {
    setIsLoading(true);
    const url = new URL(`${process.env.BACKEND}/requirement_info/`);
    url.searchParams.append('reqId', reqId);

    fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setExplanation(data);
        if (data) {
          setMarkedSatisfied(data[7]);
        }
      })
      .finally(() => setIsLoading(false));
    event.stopPropagation();
    setShowPopup(true);
  };

  const handleCancel = useCallback(() => {
    setExplanation('');
    setMarkedSatisfied(false);
    setShowPopup(false);
  }, [setExplanation, setShowPopup]); // Dependencies

  const handleSearch = useCallback(() => {
    let searchResults = [];

    if (explanation && explanation[5]) {
      searchResults = [...searchResults, ...explanation[5]];
    }
    if (explanation && explanation[6]) {
      searchResults = [...searchResults, ...explanation[6]];
    }

    searchResults.sort((course1, course2) => {
      if (course1.crosslistings < course2.crosslistings) {
        return -1;
      }
      if (course1.crosslistings > course2.crosslistings) {
        return 1;
      }
      return 0;
    });

    useSearchStore.getState().setSearchResults(searchResults);
    handleCancel();
  }, [explanation, handleCancel]);

  const handleMarkSatisfied = () => {
    if (explanation === null) {
      return;
    }
    fetch(`${process.env.BACKEND}/mark_satisfied/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ reqId: explanation ? explanation[0] : null, markedSatisfied: 'true' }),
    }).then((response) => response.json());

    setMarkedSatisfied(true);
    checkRequirements();
  };

  const handleUnmarkSatisfied = () => {
    if (explanation === null) {
      return;
    }
    fetch(`${process.env.BACKEND}/mark_satisfied/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        reqId: explanation ? explanation[0] : null,
        markedSatisfied: 'false',
      }),
    }).then((response) => response.json());

    setMarkedSatisfied(false);
    checkRequirements();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        handleSearch();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleCancel();
      }
    };

    if (showPopup) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Remove event listener if showPopup is false, or on unmount.
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPopup, handleCancel, handleSearch]);

  const modalContent = showPopup ? (
    <SettingsModal>
      <div
        style={{
          overflowWrap: 'break-word',
          flexWrap: 'wrap',
          overflowY: 'auto',
          maxHeight: '75vh',
        }}
      >
        <div className={styles.detailRow}>
          {explanation ? (
            Object.entries(explanation).map(([index, value]) => {
              if (index === '1') {
                if (value) {
                  return (
                    <div key={index} className={styles.section}>
                      <strong className={styles.strong}>{'Explanation'}: </strong>
                      <span dangerouslySetInnerHTML={{ __html: value }} />
                    </div>
                  );
                } else {
                  return (
                    <div key={index} className={styles.section}>
                      <strong className={styles.strong}>{'Explanation'}: </strong>
                      {'No explanation available'}
                    </div>
                  );
                }
              }
              if (index === '2' && value !== 8) {
                return (
                  <div key={index} className={styles.section}>
                    <strong className={styles.strong}>{'Complete by'}: </strong>
                    {semesterMap[value]}
                  </div>
                );
              }
              if (index === '3' && value[0]) {
                return (
                  <div key={index} className={styles.section}>
                    <strong className={styles.strong}>
                      {value.length > 1 ? 'Distribution areas' : 'Distribution area'}:{' '}
                    </strong>
                    {value
                      .map((area) => {
                        return `${area}, `;
                      })
                      .join('')
                      .slice(0, -2)}
                  </div>
                );
              }
              if (index === '5' && !explanation[3][0]) {
                return value[0] || explanation[4][0] ? (
                  <div key={index} className={styles.section}>
                    <strong className={styles.strong}>{'Course list'}: </strong>
                    {explanation[4][0]
                      ? explanation[4]
                          .map((department) => {
                            return `${department} (any), `;
                          })
                          .join('')
                          .slice(0, -2)
                      : null}
                    {explanation[4][0] && value[0] ? ', ' : null}
                    {value[0]
                      ? value
                          .slice(0, 20)
                          .map((course, index) => {
                            const separator = index === 19 && value.length > 20 ? '...' : ', ';
                            return `${course.crosslistings}${separator}`;
                          })
                          .join('')
                          .slice(0, value.length > 20 ? undefined : -2)
                      : null}
                  </div>
                ) : null;
              }
            })
          ) : (
            <LoadingComponent />
          )}
        </div>
      </div>
      <footer className='mt-auto text-right'>
        {explanation &&
          ((explanation[5] && explanation[5].length > 0) ||
            (explanation[6] && explanation[6].length > 0)) && (
            <JoyButton variant='soft' color='primary' onClick={handleSearch} size='md'>
              Search Courses
            </JoyButton>
          )}
        {isLoading ? null : markedSatisfied ? (
          <JoyButton
            variant='soft'
            color='warning'
            onClick={handleUnmarkSatisfied}
            sx={{ ml: 2 }}
            size='md'
          >
            Unmark Satisfied
          </JoyButton>
        ) : (
          <JoyButton
            variant='soft'
            color='success'
            onClick={handleMarkSatisfied}
            sx={{ ml: 2 }}
            size='md'
          >
            Mark Satisfied
          </JoyButton>
        )}
        <JoyButton variant='soft' color='neutral' onClick={handleCancel} sx={{ ml: 2 }} size='md'>
          Close
        </JoyButton>
      </footer>
    </SettingsModal>
  ) : null;

  const handleClick = (crosslistings, reqId) => {
    fetch(`${process.env.BACKEND}/manually_settle/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ crosslistings: crosslistings, reqId: reqId }),
    }).then((response) => response.json());

    checkRequirements();
  };

  const renderContent = (data: Dictionary) => {
    return Object.entries(data).map(([key, value]) => {
      if (
        key === 'req_id' ||
        key === 'satisfied' ||
        key === 'manually_satisfied' ||
        key === 'count' ||
        key === 'min_needed' ||
        key === 'max_counted'
      ) {
        return null;
      }
      const isArray = Array.isArray(value);
      if (isArray) {
        const containerRef = useRef<HTMLDivElement>(null);
        const endIconRef = useRef(null);
        const [maxWidth, setMaxWidth] = useState(0);
        const [endIconWidth, setEndIconWidth] = useState(0);

        useEffect(() => {
          const calculateMaxWidth = () => {
            if (containerRef.current) {
              const buttons = containerRef.current.querySelectorAll('button');
              const widths = Array.from(buttons).map(button => button.offsetWidth);
              const maxWidth = Math.max(...widths);
              setMaxWidth(maxWidth + 1);
            }
            if (endIconRef.current) {
              setEndIconWidth(endIconRef.current.offsetWidth);
            }
          };

          setTimeout(calculateMaxWidth, 1);
          
        }, [value]);

        if (key === 'settled') {
          // console.log(maxWidth);
          // Render as disabled buttons
          return (
          <div ref = {containerRef}>
            {value[0].map((item, index) => (
            <Button
              key={index}
              variant='contained'
              disabled={!item['manually_settled']}
              style={{
                margin: '5px',
                backgroundColor: '#f7f7f7',
                color: '#000',
                // minWidth: '100px',
                width: maxWidth ? `${maxWidth}px` : 'auto'
              }}
              onClick={() => handleClick(item['crosslistings'], value[1])}
            >
              {item['code']}
            </Button>
          ))}
          </div>);
        } else if (key === 'unsettled') {
          // Render as normal buttons
          // console.log(maxWidth);
          return (
            <div ref = {containerRef}>
              {value[0].map((item, index) => (
            <Button
              key={index}
              variant='contained'
              style={{
                margin: '5px',
                backgroundColor: '#f7f7f7',
                color: '#000',
                opacity: 0.5,
                // minWidth: '100px',
                width: maxWidth ? `${maxWidth}px` : 'auto'
              }}
              onClick={() => handleClick(item['crosslistings'], value[1])}
              endIcon = {<ErrorOutlineIcon ref = {endIconRef} style = {{color: 'orange'}} />}
            >
              {item['code']}
            </Button>
          ))}
            </div>
          );
        }
      }
      const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
      const isRestrictions = key === 'Restrictions';
      const satisfactionElement =
        isObject && 'satisfied' in value ? (
          <SatisfactionStatus
            satisfied={value.satisfied}
            manuallySatisfied={value.manually_satisfied}
            count={value.count}
            minNeeded={value.min_needed}
            maxCounted={value.max_counted}
            isRestrictions={isRestrictions}
          />
        ) : null;

      const subItems = isObject ? { ...value, satisfied: undefined } : value;
      let settledEmpty = false;
      let unsettledEmpty = false;

      if (Object.prototype.hasOwnProperty.call(value, 'settled')) {
        if (Array.isArray(value['settled']) && value['settled'].length > 0) {
          settledEmpty = Array.isArray(value['settled'][0]) && value['settled'][0].length === 0;
        }
      }
      if (Object.prototype.hasOwnProperty.call(value, 'unsettled')) {
        if (Array.isArray(value['unsettled']) && value['unsettled'].length > 0) {
          unsettledEmpty =
            Array.isArray(value['unsettled'][0]) && value['unsettled'][0].length === 0;
        }
      }

      const hasItems = settledEmpty && unsettledEmpty;
      const hasNestedItems = isObject && Object.keys(subItems).length > 0;

      // Style adjustments for accordion components
      return (
        <Accordion
          key={key}
          style={{ margin: '0', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}
          expanded={!expanded.has(key)}
          onChange={(event) => handleChange(event, key)} // TODO: disable propagation in modals
        >
          <AccordionSummary
            expandIcon={hasNestedItems && !hasItems ? <ExpandMoreIcon /> : null}
            aria-controls={`${key}-content`}
            id={`${key}-header`}
            style={{ backgroundColor: '#f6f6f6' }} // subtle background color
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div
                className={classNames(styles.Action)}
                onClick={(event) => handleExplanationClick(event, data[key]['req_id'])}
              >
                <Typography style={{ fontWeight: 500 }}>{key}</Typography>
              </div>
              {satisfactionElement}
            </div>
          </AccordionSummary>
          {!hasItems && (
            <AccordionDetails>
              {hasNestedItems ? renderContent(subItems) : <Typography>{value}</Typography>}
            </AccordionDetails>
          )}
        </Accordion>
      );
    });
  };

  return (
    <>
      {renderContent(data)}
      {modalContent}
    </>
  );
};

// Recursive dropdown component
interface RecursiveDropdownProps {
  dictionary: Dictionary;
  csrfToken: string;
  checkRequirements: any;
}

const RecursiveDropdown: FC<RecursiveDropdownProps> = ({
  dictionary,
  csrfToken,
  checkRequirements,
}) => {
  return <Dropdown data={dictionary} csrfToken={csrfToken} checkRequirements={checkRequirements} />;
};

export default RecursiveDropdown;
