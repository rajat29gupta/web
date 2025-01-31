var seconds_per_question = 15;

var start_quiz = async function() {
  document.quiz_started = true;
  var question_number = 0;
  var should_continue = true;

  start_music_midi('boss-battle');
  await sleep(1500);

  while (should_continue) {
    orb_state(Math.min(question_number + 1, 4));
    document.submitted_answer = false;
    var answers = [];

    for (var d = 0; d < $('.answer.selected').length; d += 1) {
      answers[d] = $('.answer.selected a')[d].innerHTML;
    }
    var response = await post_state({
      'question_number': question_number,
      'answers': answers
    });

    // manage state transitoin
    console.log('question from', question_number, ' to', question_number + 1);
    for (var p = 0; p < 10; p += 1) {
      $('body').removeClass('question_number_' + p);
    }
    $('body').addClass('question_number_' + question_number);

    question_number += 1;
    var can_continue = response['can_continue'];
    var did_win = response['did_win'];

    if (did_win) {
      // won the game
      await winner(response['prize_url']);
      return;
    } else if (!can_continue) {
      // ded
      await death();
      return;
    }

    if (answers.length) {
      // got a question right
      $('#protagonist .heal').removeClass('hidden');
      setTimeout(function() {
        $('#protagonist .heal').addClass('hidden');
      }, 2000);
      await toggle_character_class($('#protagonist'), [ 'heal', '' ]);
      await toggle_character_class($('#enemy'), [ 'harm', '' ]);
    }
    
    var question = response['question']['question'];
    var possible_answers = response['question']['responses'];
    var html = '';

    for (var i = 0; i < possible_answers.length; i += 1) {
      var ele = possible_answers[i]['answer'];

      html += '<li class=answer>(' + (i + 1) + ') <a href=#>' + ele + '</a></li>';
    }
    $('#enemy .attack').removeClass('hidden');
    setTimeout(function() {
      $('#enemy .attack').addClass('hidden');
    }, 2000);
    $('#enemy').effect('bounce');
    await $('#cta_button a').html('Submit Response 📨');
    await $('#header').html(question);
    await $('#desc').html(html);
    await $('#header').removeClass('hidden').fadeIn();
    await $('#desc').removeClass('hidden').fadeIn();
    await $('#cta_button').removeClass('hidden').fadeIn();
    var timer = seconds_per_question * 1000;

    while (timer > 0 && !document.submitted_answer) {
      await sleep(100);
      if (!document.pause) {
        timer -= 100;
      }
      $('#timer').removeClass('hidden').html(timer / 1000 + 's left');
      if (timer < 7500) {
        $('#timer').addClass('yellow');
      } else if (timer < 2000) {
        $('#timer').addClass('orange');
      } else {
        $('#timer').removeClass('orange').removeClass('yellow').removeClass('red');
      }
    }
    timer = 2 * 1000;

    while (timer > 0 && !document.submitted_answer) {
      await sleep(100);
      timer -= 100;

      $('#timer').addClass('red').html(0 + 's left');
    }
    $('#timer').removeClass('red').html('...');
  }
};


var advance_to_state = async function(new_state) {

  // setup
  if (document.state_transitioning) {
    return;
  }
  if (document.quiz_started) {
    document.submitted_answer = 1;
    return;
  }

  // confirm
  if (new_state == 4) {
    var sure = confirm('are you sure?  make sure you study up. if you fail the quest, you cannot try again until after the cooldown period (' + document.quest['cooldown_minutes'] + ' mins).');

    if (!sure) {
      await $('#cta_button').removeClass('hidden').fadeIn();
      return;
    }
  }

  document.state_transitioning = true;

  var old_state = document.quest_state;

  // generic pre-state transition hooks
  await $('#header').fadeOut();
  await sleep(500);
  await $('#cta_button').fadeOut();
  document.typewriter_txt = '';
  await $('#desc').fadeOut();
  await sleep(500);

  // custom pre-state transition hooks
  // 2 to 3
  if (old_state == 2) {
    start_music_midi('hero');
    await sleep(2000);
    await toggle_character_class($('#protagonist'), [ 'heal', '' ]);
  }

  // manage state transitoin
  console.log('state from', old_state, '/', document.quest_state, ' to', new_state);
  document.quest_state = new_state;
  for (var p = 0; p < 10; p += 1) {
    $('body').removeClass('stage_' + p);
  }
  $('body').addClass('stage_' + new_state);


  // -- individual transitions callbacks --

  // 0 to 1
  if (old_state == 0 && new_state == 1) {
    await sleep(1000);
    if (!document.contxt['github_handle']) {
      document.location.href = document.location.href.replace('#', '') + '?login=1';
    }
    await $('#header').html('Quest Intro');
    await $('#header').fadeIn();
    await sleep(1000);
    await $('#desc').html('');
    await $('#desc').removeClass('hidden').fadeIn();
    document.typewriter_id = 'desc';
    document.typewriter_i = 0;
    document.typewriter_txt = document.quest.game_schema.intro;
    document.typewriter_speed = 30;
    typeWriter();
    var kudos_reward_html = " <BR><BR> If you're successful in this quest, you'll earn this limited edition <strong>" + document.kudos_reward['name'] + "</strong> Kudos: <BR> <BR> <img style='height: 250px;width: 220px;' src=" + document.kudos_reward['img'] + '>';

    setTimeout(function() {
      var new_html = $('#desc').html() + kudos_reward_html;

      $('#desc').html(new_html);
    }, 3500);

    await $('#desc').removeClass('hidden').fadeIn();
    await sleep(4000);
    await $('#cta_button a').html('Continue 🤟');
    await $('#cta_button').removeClass('hidden').fadeIn();
  }/* 1 to 2 */ else if (old_state == 1) {
    await sleep(1000);
    await $('#header').html('Quest Rules');
    await $('#header').fadeIn();
    show_prize();
    start_music_midi('boss');
    await sleep(1000);
    await $('#helpful_guide').fadeOut();
    await $('#desc').html('');
    await $('#desc').removeClass('hidden').fadeIn();
    document.typewriter_id = 'desc';
    document.typewriter_i = 0;
    document.typewriter_txt = document.quest.game_schema.rules;
    document.typewriter_speed = 50;
    typeWriter();
    await sleep(1500);
    await $('#enemy').removeClass('hidden');
    await toggle_character_class($('#enemy'), [ 'heal', 'harm' ]);
    await $('#cta_button a').html('Got It 🤙');
    await $('#cta_button').removeClass('hidden').fadeIn();
  }/* 2 to 3 */ else if (old_state == 2) {
    await sleep(1000);
    await $('#header').html('');
    await $('#desc').html('');
    await $('#header').html('Quest Prep');
    await $('#header').fadeIn();
    await sleep(1000);
    await $('#desc').html('');
    var text = 'You will be given the following links to prepare for your journey.*';
    var html = '';
    var iterate_me = document.quest.game_schema.prep_materials;

    for (var i = 0; i < iterate_me.length; i += 1) {
      var ele = iterate_me[i];

      html += '<li><a href=' + ele.url + ' target=new>' + ele.title + '</a></li>';
    }
    html += '<BR> Take a moment and read through them. You will have limited time to look things up when the quest starts.';
    setTimeout(function() {
      var new_html = $('#desc').html() + html;

      $('#desc').html(new_html);
    }, 4000);

    document.typewriter_id = 'desc';
    document.typewriter_i = 0;
    document.typewriter_txt = text;
    document.typewriter_speed = 50;
    typeWriter();
    await $('#desc').removeClass('hidden').fadeIn();
    await sleep(1000);
    await $('#cta_button a').html('Got It 🤙');
    await $('#cta_button').removeClass('hidden').fadeIn();
  }/* 3 to 4 */ else if (old_state == 3) {
    show_prize();
    await $('#helpful_guide').fadeOut();
    await sleep(500);
    $('.skip_intro').remove();
    await $('#enemy').removeClass('hidden');
    start_quiz();

  }

  // wrap up
  document.state_transitioning = false;
};

var death = async function() {
  orb_state('dead');
  $('#protagonist .ded').removeClass('hidden');
  await $('#header').fadeOut();
  await $('#cta_button').fadeOut();
  await $('#desc').fadeOut();
  start_music_midi('dead');
  await toggle_character_class($('#protagonist'), [ 'harm', '' ]);
  await sleep(500);
  await $('.prize').effect('explode');
  await sleep(1000);
  $('#protagonist').effect('explode');
  await sleep(200);
  await $('#header').addClass('fail').fadeIn().html('You Lose - Try again in ' + document.quest['cooldown_minutes'] + ' mins. ');
  await sleep(2500);
  await $('#header').fadeOut();
  await sleep(500);
  await $('#desc').html('<a class=button href=/quests>More Quests &gt;&gt;</a>').fadeIn();
  setInterval(function() {
    random_taunt_effect($('#enemy'));
  }, 2000);
};

var winner = async function(prize_url) {
  orb_state('final');
  $('#enemy .ded').removeClass('hidden');
  await $('#header').fadeOut();
  await $('#cta_button').fadeOut();
  await $('#desc').fadeOut();
  await sleep(500);
  $('#enemy').effect('explode');
  await sleep(500);
  await toggle_character_class($('#protagonist'), [ 'heal', '' ]);
  await sleep(500);
  await $('#header').addClass('success').fadeIn().html('You Win');
  var span = '<span style="display:block; font-weight: bold; font-size: 24px;">🏆Quest Prize🏅</span>';

  start_music_midi('secret-discovery');

  $('#desc').html(span + "<img style='height: 250px;width: 220px;' src=" + document.kudos_reward['img'] + '>');
  $('.prize').fadeOut();
  $('#desc').fadeIn();
  await sleep(3000);
  document.location.href = prize_url;
};

var start_quest = function() {
  $('#gameboard #header').html(document.quest['title']);
  document.quest_state = 0;
};

$(document).ready(function() {
  // force the music to load
  setTimeout(function() {
    if (document.quest) {
      start_music_midi('boss-battle');
      pause_music_midi('boss-battle');
    }
  }, 100);

  $('#reflink').click(function() {
    $(this).focus();
    $(this).select();
    document.execCommand('copy');
    $(this).after('<div class=after_copy>Copied to clipboard</div>');
    setTimeout(function() {
      $('.after_copy').remove();
    }, 500);
  });

  $('.demo').click(function(e) {
    e.preventDefault();
    $(this).fadeOut(function() {
      $('.demo').fadeIn();
      var src = $('.demo').attr('src') + '?';
      
      $('.demo').attr('src', src);
    });
  });

  $('#tabs a').click(function(e) {
    e.preventDefault();
    var target = $(this).data('href');

    $('.difficulty_tab').addClass('hidden');
    $('.nav-link').removeClass('active');
    $(this).addClass('active');
    $('.difficulty_tab.' + target).removeClass('hidden');
  });

  $('.quest-card.available').click(function(e) {
    e.preventDefault();
    document.location.href = $(this).find('a').attr('href');
  });
  $('.quest-card.available').mouseover(function(e) {
    random_attn_effect($(this).find('.btn'));
  });

  // makes the reflink sticky
  if (getParam('cb')) {
    var cb = getParam('cb');
    // only if user is not logged in tho

    if (cb.indexOf('ref') != -1 && !document.contxt.github_handle) {
      localStorage.setItem('cb', cb);
    }
  }
  // if there exists a sticky reflink but the user navigated away from the link in the course of logging in...
  if (localStorage.getItem('cb') && document.contxt.github_handle && !getParam('cb')) {
    var url = new URL(document.location.href);

    url.searchParams.append('cb', localStorage.getItem('cb'));
    url.search = url.search.replace('%3A', ':');
    localStorage.setItem('cb', '');
    document.location.href = url;
  }

  if ($('#protagonist').length) {
    var preload_assets = async function() {
      var items = [ 'stage_4', 'question_number_1', 'question_number_2' ];

      for (var i = 0; i < 3; i += 1) {
        await sleep(10);
        await $('body').addClass(items[i]);
        console.log($('body').attr('class'));
      }
      for (var j = 0; j < 3; j += 1) {
        await sleep(10);
        await $('body').removeClass(items[j]);
      }
    };

    preload_backgrounds();
  }

  $('#protagonist h3').html(trim_dots($('#protagonist h3').text(), 8));

  $(document).on('click', '.answer', function(e) {
    e.preventDefault();
    $(this).toggleClass('selected');
  });
  if (document.quest) {
    start_quest();
  }
});
