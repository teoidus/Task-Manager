class Time {
  static now() { return Date.now(); }
  // converts string w/ format ((scalar)(unit))+ (where (scalar) is any real and (unit) is any key of knownUnits)
  // to ms
  static parseDuration(s) {
    let scalars = s.split(/[^0-9.]+/).reverse().splice(1).reverse();
    let units = s.split(/[0-9.]+/).splice(1);
    if (scalars.length != units.length)
      throw 'Invalid duration format';
    let knownUnits = { ms: 1, s: 1000, m: 60*1000, h: 60*60*1000, d: 24*60*60*1000, w: 7*24*60*60*1000 };
    let result = 0;
    for (let i = 0; i < scalars.length; ++i) {
      if (units[i] in knownUnits)
        result += scalars[i] * knownUnits[units[i]];
      else
        throw 'Unrecognzied time unit "' + units[i] + '"';
    }
    return result;
  }
  // converts string w/ format (time)( (date))?, where:
  //   date has format ([1-9]|1[0-2])(-|/)([1-9]|(1|2)[0-9]|3(0|1))(-|/)(\d\d\d?\d?)? (month/day/year)
  //   time has format ([1-9]|1[0-2]):([1-9]|[1-5][0-9]):([1-9]|[1-5][0-9])(\.[0-9]*)? (hh:mm:ss.frac_seconds)
  // to ms
  static parseStamp(s) {
    // split into date and time
    let [time, date] = s.split(' ');
    
    // from date, extract (m, d, y)
    var matches = new RegExp('(1[0-2]|[1-9])(-|/)(3[0-1]|[1-2][0-9]|[1-9])(-|/)([1-9]?[0-9]?[0-9][0-9])?').exec(date);
    if (matches) var [_, m, _, d, _, y] = matches;
    
    // from time, extract (hh, mm, ss, frac, ampm)
    var matches = new RegExp('(2[0-3]|1[0-9]|[1-9])(:([0-5][0-9]|[1-9])(:([1-5][0-9]|[1-9])(\\.[0-9]*)?)?)?(am|pm)?').exec(time);
    if (matches) var [_, hh, _, mm, _, ss, frac, ampm] = matches;
    
    // for any undefined date variables, default to current date
    let current = new Date();
    m = (typeof m != 'undefined') ? +m : current.getMonth()+1; // Date.getMonth is zero-based
    d = (typeof d != 'undefined') ? +d : current.getDate();
    y = (typeof y != 'undefined') ? +y : current.getFullYear();
    
    // for any undefined time variables, default to current time
    // ampm defaults to the current ampm state (if 3pm, 3 -> 3pm)
    // pm hh are converted by +12s (3pm -> hh = 15)
    ampm = (typeof ampm != 'undefined') ? ampm : ['am', 'pm'][+(current.getHours() >= 12)];
    hh = (typeof hh != 'undefined') ? +hh + {am:0,pm:12}[ampm] : current.getHours();
    mm = (typeof mm != 'undefined') ? +mm : current.getMinutes();
    ss = (typeof ss != 'undefined') ? +ss : current.getSeconds();
    frac = (typeof frac != 'undefined') ? +frac : current.getMilliseconds()/1000;
    
    //console.log(JSON.stringify(date), JSON.stringify(time), JSON.stringify(m), JSON.stringify(d), JSON.stringify(y), JSON.stringify(hh), JSON.stringify(mm), JSON.stringify(ss), JSON.stringify(frac), JSON.stringify(ampm));
    //console.log(m, d, y, hh, mm, ss, frac, ampm);
    //console.log(Date.UTC(y, m-1, d, hh, mm, ss, frac));
    return Date.UTC(y, m-1, d, hh-1, mm, ss, frac); // for some reason, Date.UTC wants hours in [-1, 22]
  }
  // converts string w/ format (stamp)(\+(duration))? to ms
  static parse(s) {
    var [stamp, duration] = s.split('+');
    var stamp = (typeof stamp != 'undefined') ? Time.parseStamp(stamp) : Time.now();
    var duration = (typeof duration != 'undefined') ? Time.parseDuration(duration) : 0;
    
    return stamp + duration;
  }
  static until(then) {
    return ((typeof then == 'string') ? Time.parse(then) : then) - Time.now();
  }
}

class Task {
  constructor(name='', duration='0ms', deadline='+8640000000000000ms', done=false) {
    this.name = name;
    this.duration = Time.parseDuration(duration);
    this.deadline = Time.parse(deadline);
    this.done = done;
  }
  timeLeft() { return Time.until(this.deadline); }
}

class TaskManager {
  constructor(tasks, deadline) {
    this.deadline = Time.parse(deadline);
    this.tasks = tasks;
  }
  // returns, for the current moment, { free: freeTime, tasks: [{ name, timeLeft }] }
  snapshot() {
    let allocated = 0.0;
    let tasks = [];
    let globalTimeLeft = Time.until(this.deadline);
    for (let i = 0; i < this.tasks.length; ++i) {
      let timeLeft = Math.min(this.tasks[i].timeLeft(), globalTimeLeft);
      allocated += Math.min(timeLeft, this.tasks[i].duration);
      tasks.push({ name: this.tasks[i].name, timeLeft: timeLeft });
    }
    return {
      free: globalTimeLeft - allocated,
      tasks: tasks
    };
  }
}

// commands: add, del, adj, fin 