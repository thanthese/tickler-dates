Command line tool for completing and repeating dates within a compact, human-readable calendar/[tickler](https://en.wikipedia.org/wiki/Tickler) file. Basically a big ball of "Do what I mean" for dates. Makes living in plain text that much easier.

Operates on `STDIN` and `STDOUT`. To output the nearest Wednesday:

    $ echo "w description" | tickler-dates
    15.09.16w description

Intended use is to pipe a line from a text editor through the utility and back into the active buffer, as with Vim's `!!` or Emacs' `shell-command-on-region`.

# Installation

    $ go get https://github.com/thanthese/tickler-dates

# Calendar/tickler file format

Imagine a file that looks like this:

    15.09.01t be diplomatic
    15.09.09w polish head
    15.09.12s send key personnel on dangerous away mission
    15.09.14m practice flute

Each line is an entry. The first half is the date in `YY.MM.DDw` format (where Monday through Sunday is `m`, `t`, `w`, `r`, `f`, `s`, `u`), and the rest is a description. This format allows the file to be sorted with `sort -n`.

# Operations

*Note: these examples assume that today is `15.09.10r`.*

A vanilla entry with a complete date (and optional description) is left alone.

    15.09.15w these are both no-ops
    15.09.15w

A bare description will prepend today:

    nothing   =>   15.09.10r nothing

A partial date will be completed (leading whitespace shown for clarity only). Incorrect weekdays will be corrected.

       09.12s no year            =>   15.09.12s no year
        9.12s no leading zeros   =>   15.09.12s no leading zeros
          12s no month           =>   15.09.12s no month
            s no day             =>   15.09.12s no day
    15.09.12  no weekday         =>   15.09.12s no weekday
       09.12                     =>   15.09.12s
        9.12                     =>   15.09.12s
          12                     =>   15.09.12s
    15.09.12w corrected to s     =>   15.09.12s corrected to s

You can specify an amount to add to the date in terms of `d`ays, `w`eeks, `m`onths, or `y`ears. Defaults to `1` and `d` if pieces are left out.

    15.09.12s+1  add day   =>   15.09.13u add day
    15.09.12s+1d add day   =>   15.09.13u add day
    15.09.12s+d  add day   =>   15.09.13u add day
    15.09.12s+   add day   =>   15.09.13u add day
    15.09.12s+20y          =>   35.09.10m

The utility accepts a plus argument `-p` that behaves similarly. Use it to add a (possibly negative) number of days to the date.

    $ echo "15.09.10 add 4 days" | tickler-dates -p 4
    15.09.14m add 4 days

    echo "15.09.10 subtract 4 days" | tickler-dates -p -4
    15.09.06u subtract 4 days

You can define a repetition interval anywhere in the description, separated from the other text by whitespace (and optionally surrounded with `()`s). `>` adds to the shown date. This is useful for, say, tracking a weekly appointment. Repetition intervals are only applied for "complete dates" -- that is, the year was specified, there was no add, and a plus argument was not used.

    15.09.12s > plus    one    day       =>   15.09.13u > plus    one    day
    15.09.12s   plus >1 one    day       =>   15.09.13u   plus >1 one    day
    15.09.12s   plus    one >d day       =>   15.09.13u   plus    one >d day
    15.09.12s   plus    one    day >1d   =>   15.09.13u   plus    one    day >1d

    15.09.12s (>4w) plus 4 weeks   =>   15.10.10s (>4w) plus 4 weeks
    15.09.12s (>1m) plus 1 month   =>   15.10.12m (>1m) plus 1 month
    15.09.12s (>2y) plus 2 years   =>   17.09.12t (>2y) plus 2 years

`+` works almost the same way, but it adds from *today* rather than whatever date is shown. As an example, let's say you'd like to get a haircut every 2 weeks. But if you don't get a haircut for 3 weeks, you don't want the next one in 1 week -- you still want it 2 weeks from now. `+` preserves the spacing between reminders.

    11.02.01t +1w   =>   15.09.17r +1w

The by-week `|` operator handles those "2nd Sunday of the month" situations.

    15.09.10r |m+1r 1st Thursday of next month
    15.09.10r |m+2r 2nd Thursday of next month
    15.09.10r |m-1r last Thursday of next month
    15.09.10r |m-2r 2nd-to-last Thursday of next month

    15.09.10r |y+1r 1st Thursday of this month next year

When you just want today's date, the `-t` option will spit it out today.

    $ tickler-date -t
    15.09.10r

Finally, you can operate on several lines at the same time.

# Vim mappings

These mappings live in my `.vimrc`. You may enjoy.

```viml
nnoremap <space>d !!tickler-dates<cr>
nnoremap <space>D !!tickler-dates -p<space>
inoremap <C-t> <c-r>=system("tickler-dates -t")<cr><space>
```

# Prefer node to go?

Try the node branch! It's no longer maintained, but it does roughly (exactly) the same thing.

# License
MIT
