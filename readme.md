Command line tool for completing and repeating dates within a compact, human-readable calendar/[tickler](https://en.wikipedia.org/wiki/Tickler) file. Basically a big ball of "Do what I mean" for dates. Makes living in plain text that much easier.

Operates on `STDIN` and `STDOUT`. To output the nearest Wednesday:

```
> echo "w description" | node bump-date.js
15.09.16w description
```

Intended use is to pipe a line from a text editor through the utility and back into the active buffer, as with Emacs' `shell-command-on-region` or Vim's `!!`.

# Installation

Requires [note](https://nodejs.org/) and the [PEG.js](http://pegjs.org/online) library. To install:

```
> git clone https://github.com/thanthese/tickler-dates
> cd tickler-dates
> npm install pegjs
```

To run tests:

```
> node tests.js
```

# Calendar/tickler file format

Imagine a file that looks like this:

```
15.09.01t be diplomatic
15.09.09w polish head
15.09.12s send key personnel on dangerous away mission
15.09.14m practice flute
```

Each line is an entry. The first half is the date in `YY.MM.DDw` format (where Monday through Sunday is `m`, `t`, `w`, `r`, `f`, `s`, `u`), and the rest is a description. This format allows the file to be sorted with ~sort -n~.

# Operations

*Note: these examples assume that today is `15.09.10r`.*

A vanilla entry with a complete date (and optional description) is left alone.

```
15.09.15w these are both no-ops
15.09.15w
```

A bare description will prepend today:

```
nothing   =>  15.09.10r nothing
```

A partial date will be completed (leading whitespace shown for clarity only). Incorrect weekdays will be corrected.

```
   09.12s no year            =>   15.09.12s no year
    9.12s no leading zeros   =>   15.09.12s no leading zeros
      12s no month           =>   15.09.12s no month
        s no day             =>   15.09.12s no day
15.09.12  no weekday         =>   15.09.12s no weekday
   09.12                     =>   15.09.12s
    9.12                     =>   15.09.12s
      12                     =>   15.09.12s
15.09.12w corrected to s     =>   15.09.12s corrected to s
```

You can specify an amount to add to the date in terms of `d`ays, `w`eeks, `m`onths, or `y`ears. Defaults to `1` and `d` if pieces are left out.

```
15.09.12s+1d add day  =>   15.09.13u add day
15.09.12s+1  add day  =>   15.09.13u add day
15.09.12s+d  add day  =>   15.09.13u add day
15.09.12s+   add day  =>   15.09.13u add day
15.09.12s+20y   =>   35.09.10m
```

The utility accepts a `--plus` argument that behaves similarly. Use it to add a (possibly negative) number of days to the date.

```
> echo "15.09.10 add 4 days" | node main.js --plus 4
15.09.14m add 4 days

echo "15.09.10 subtract 4 days" | node main.js --plus -4
15.09.06u subtract 4 days
```

You can define a repetition interval anywhere in the description, separated from the other text by whitespace. `>` adds to the shown week. Only the first repeat is accepted. This is useful for, say, tracking a weekly appointment. Repetition intervals are only applied for "complete dates" -- that is, the year was specified, there was no add, and `--plus` was not used.

```
15.09.12s > plus    one    day       =>   15.09.13u > plus    one    day
15.09.12s   plus >1 one    day       =>   15.09.13u   plus >1 one    day
15.09.12s   plus    one >d day       =>   15.09.13u   plus    one >d day
15.09.12s   plus    one    day >1d   =>   15.09.13u   plus    one    day >1d

15.09.12s >4w plus 4 weeks   =>   15.10.10s >4w plus 4 weeks
15.09.12s >1m plus 1 month   =>   15.10.12m >1m plus 1 month
15.09.12s >2y plus 2 years   =>   17.09.12t >2y plus 2 years
```

`+` works almost the same way, but it adds from *today* rather than whatever date is shown. As an example, let's say you'd like to get a haircut every 2 weeks. But if you don't get a haircut for 3 weeks, you don't want the next one in 1 week -- you still want it 2 weeks from now. `+` preserves the spacing between reminders.

```
11.02.01t +1w   =>   15.09.17r +1w
```

Finally, there's the by-week `|` operator which handles those "2nd Sunday of the month" situations.

```
15.09.10r |m+1r 1st Thursday of next month
15.09.10r |m+2r 2nd Thursday of next month
15.09.10r |m-1r last Thursday of next month
15.09.10r |m-2r 2nd-to-last Thursday of next month

15.09.10r |y+1r 1st Thursday of this month next year
```

# Emacs-specific suggestions

I find these functions helpful for working with dates within emacs.

``` elisp
  (defconst bump-date-program "node ~/Dropbox/programming/tickler-dates/main.js")

  (defun bump-date (arg)
    "Bump date on active region or current line.

  Call with a prefix argument to use the --plus argument.

      c-u          | 1
      c-u c-u      | 2
      c-u c-u c-u  | 3
      etc...

      c-u 1 or c-1 | 1
      c-u 2 or c-2 | 2
      c-u 3 or c-3 | 3
      etc...

  http://github.com/thanthese/tickler-dates"
  (interactive "P")
  (let* ((n (cond ((equal arg nil) 0)
                  ((consp arg) (log (car arg) 4))
                  (t arg)))
         (cmd (concat bump-date-program " --plus " (number-to-string n))))
    (save-excursion
      (if (region-active-p)
          (shell-command-on-region (region-beginning) (region-end) cmd t t)
        (shell-command-on-region (line-beginning-position) (line-end-position) cmd t t)))))

  (defun insert-date ()
    "Insert current date into current buffer via my tickler-dates.js."
    (interactive)
    (shell-command (concat "echo \"\" | " bump-date-program) t)
    (move-end-of-line 1))

  (define-key prelude-mode-map (kbd "s-d") 'bump-date)
  (define-key prelude-mode-map (kbd "s-D") 'insert-date)

  ;; Within org-mode, I like my dates to be syntax highlighted
  ;; different colors depending on the day of the week. I also like to
  ;; use # and @ to tag entries.
  (font-lock-add-keywords
   'org-mode
   '(
     ("#[a-zA-Z0-9_-]*" 0 '(:background "Blue1") t)
     ("@[a-zA-Z0-9_-]*" 0 '(:background "#2B2B2B" :foreground "#9FC59F") t)
     ("#bday" 0 '(:background "RoyalBlue4") t)
     ("#anniversary" 0 '(:background "RoyalBlue4") t)
     ("#holiday" 0 '(:background "RoyalBlue4") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]m\\b" 0 '(:background "#669999" :foreground "black") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]t\\b" 0 '(:background "#4F9F64" :foreground "black") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]w\\b" 0 '(:background "#7FBF90" :foreground "black") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]r\\b" 0 '(:background "#6B9A33" :foreground "black") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]f\\b" 0 '(:background "#105F25" :foreground "black") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]s\\b" 0 '(:background "#FFB4AA" :foreground "black") t)
     ("\\b[0-9][0-9]\\.[0-9][0-9]\\.[0-9][0-9]u\\b" 0 '(:background "#D4776A" :foreground "black") t)
     ))
```

# Future work

If there's interest, make this npm installable.

# License
MIT
