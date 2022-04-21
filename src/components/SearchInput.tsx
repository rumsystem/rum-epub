import React from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { TextField } from '@mui/material';
import { MdSearch, MdClose } from 'react-icons/md';
import { sleep, lang } from '~/utils';
import { tooltipService } from '~/service';
import classNames from 'classnames';

interface IProps {
  size?: string
  defaultValue?: string
  required?: boolean
  placeholder: string
  className?: string
  autoFocus?: boolean
  disabledClearButton?: boolean
  search: (value: string) => void
  onBlur?: () => void
}

export const SearchInput = observer((props: IProps) => {
  const state = useLocalObservable(() => ({
    value: '',
  }));

  React.useEffect(() => {
    if (props.defaultValue && !state.value) {
      state.value = props.defaultValue;
    }
  }, [state, props]);

  const onChange = (e: any) => {
    state.value = e.target.value;
  };

  const onKeyDown = async (e: any) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      e.target.blur();
      if (props.required && !state.value) {
        tooltipService.show({
          content: lang.searchText,
          type: 'error',
        });
        return;
      }
      await sleep(100);
      props.search(state.value);
    }
  };

  const onBlur = () => {
    if (props.onBlur) {
      props.onBlur();
    }
  };

  return (
    <div className="relative">
      <div className="text-20 text-gray-af flex items-center absolute top-0 left-0 h-full z-10 ml-[10px]">
        <MdSearch />
      </div>
      {state.value && !props.disabledClearButton && (
        <div className="flex items-center absolute top-0 right-0 z-10 h-full mr-[10px] mt-7-px cursor-pointer">
          <div
            className="flex items-center justify-center bg-gray-f7 text-black rounded-full text-18"
            onClick={async () => {
              state.value = '';
              await sleep(200);
              props.search('');
            }}
          >
            <MdClose />
          </div>
        </div>
      )}
      <form action="/">
        <TextField
          className={classNames(
            'search-input',
            props.className,
          )}
          classes={{
            root: '',
          }}
          InputLabelProps={{
            classes: {
              outlined: '',
            },
          }}
          inputProps={{
            className: classNames(
              'text-gray-88',
              props.size !== 'small' && 'pt-[10px] pr-[10px] pb-[9px] pl-[34px]',
              props.size === 'small' && 'pt-[8px] pr-[11px] pb-[7px] pl-[36px]',
            ),
          }}
          InputProps={{
            className: 'rounded-full',
            classes: {
              notchedOutline: 'border-2 border-gray-33',
            },
          }}
          placeholder={props.placeholder || '搜索'}
          size="small"
          autoFocus={props.autoFocus || false}
          value={state.value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          margin="none"
          variant="outlined"
          type="search"
        />
      </form>
    </div>
  );
});
